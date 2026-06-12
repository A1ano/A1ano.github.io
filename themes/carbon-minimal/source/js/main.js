const externalLinks = document.querySelectorAll('a[href^="http"]');

externalLinks.forEach((link) => {
  if (link.hostname !== window.location.hostname) {
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
  }
});

const article = document.querySelector('.article');
const articleContent = document.querySelector('.article-content');
const progressBar = document.querySelector('[data-reading-progress] span');
const toc = document.querySelector('[data-article-toc]');
const tocList = document.querySelector('[data-toc-list]');

const uniqueId = (() => {
  const used = new Set();

  return (text, index) => {
    const base = text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || `section-${index + 1}`;
    let id = base;
    let count = 2;

    while (used.has(id) || document.getElementById(id)) {
      id = `${base}-${count}`;
      count += 1;
    }

    used.add(id);
    return id;
  };
})();

if (article && articleContent && toc && tocList) {
  const headings = [...articleContent.querySelectorAll('h2, h3')];

  if (headings.length === 0) {
    toc.hidden = true;
  } else {
    const topLink = document.createElement('a');
    topLink.href = '#article-top';
    topLink.className = 'toc-link toc-level-1 is-active';
    topLink.textContent = document.querySelector('.article-header h1')?.textContent || '文章开头';
    tocList.appendChild(topLink);

    headings.forEach((heading, index) => {
      if (!heading.id) {
        heading.id = uniqueId(heading.textContent || '', index);
      }

      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.className = `toc-link toc-level-${heading.tagName === 'H2' ? '2' : '3'}`;
      link.textContent = heading.textContent;
      tocList.appendChild(link);
    });

    const tocLinks = [...tocList.querySelectorAll('.toc-link')];

    const setActive = (id) => {
      tocLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
      });
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];

        if (visible) {
          setActive(visible.target.id);
        }
      }, {
        rootMargin: '-24% 0px -68% 0px',
        threshold: 0
      });

      [document.getElementById('article-top'), ...headings].forEach((heading) => {
        if (heading) observer.observe(heading);
      });
    }
  }
}

if (article && progressBar) {
  const updateProgress = () => {
    const rect = article.getBoundingClientRect();
    const start = window.scrollY + rect.top - 90;
    const end = start + article.offsetHeight - window.innerHeight + 120;
    const progress = (window.scrollY - start) / Math.max(end - start, 1);
    const clamped = Math.min(Math.max(progress, 0), 1);
    progressBar.style.transform = `scaleX(${clamped})`;
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

const schedulePage = document.querySelector('[data-schedule-page]');

if (schedulePage) {
  const dataUrl = schedulePage.dataset.source;
  const grid = schedulePage.querySelector('[data-schedule-grid]');
  const pendingList = schedulePage.querySelector('[data-schedule-pending]');
  const countNode = schedulePage.querySelector('[data-schedule-count]');
  const currentCountNode = schedulePage.querySelector('[data-schedule-current-count]');
  const referenceCountNode = schedulePage.querySelector('[data-schedule-reference-count]');
  const pendingCountNode = schedulePage.querySelector('[data-schedule-pending-count]');
  const monthTitle = schedulePage.querySelector('[data-schedule-month-title]');
  const searchInput = schedulePage.querySelector('[data-schedule-search]');
  const levelSelect = schedulePage.querySelector('[data-schedule-level]');
  const prevButton = schedulePage.querySelector('[data-schedule-prev]');
  const nextButton = schedulePage.querySelector('[data-schedule-next]');
  const dialog = schedulePage.querySelector('[data-schedule-dialog]');
  const dialogTitle = schedulePage.querySelector('[data-dialog-title]');
  const dialogStatus = schedulePage.querySelector('[data-dialog-status]');
  const dialogChips = schedulePage.querySelector('[data-dialog-chips]');
  const dialogDetails = schedulePage.querySelector('[data-dialog-details]');
  const officialLink = schedulePage.querySelector('[data-dialog-official]');
  const evidenceLink = schedulePage.querySelector('[data-dialog-evidence]');
  const deletePersonalButton = schedulePage.querySelector('[data-personal-delete]');
  const personalForm = schedulePage.querySelector('[data-personal-form]');
  const personalList = schedulePage.querySelector('[data-personal-list]');

  let competitions = [];
  let personalItems = [];
  let activePersonalId = '';
  const today = new Date();
  const currentYear = today.getFullYear();
  let referenceYear = 2025;
  let visibleYear = today.getFullYear();
  let visibleMonth = today.getMonth();
  const personalStorageKey = 'alano-schedule-personal-events';

  const dateFields = [
    {
      label: '报名开始',
      current: 'registrationStart',
      reference: 'referenceRegistrationStart'
    },
    {
      label: '报名截止',
      current: 'registrationEnd',
      reference: 'referenceRegistrationEnd'
    },
    {
      label: '正式比赛',
      current: 'contestStart',
      reference: 'referenceContestStart'
    },
    {
      label: '比赛结束',
      current: 'contestEnd',
      reference: 'referenceContestEnd'
    }
  ];

  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

  const recognitionClass = (recognition = '') => {
    if (recognition.includes('A')) return 'rec-a';
    if (recognition.includes('B1')) return 'rec-b1';
    if (recognition.includes('B2')) return 'rec-b2';
    return 'rec-b3';
  };

  const parseDate = (value) => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };

  const dateKey = (date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');

  const loadPersonalItems = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(personalStorageKey) || '[]');
      return Array.isArray(parsed) ? parsed.filter((item) => item.title && parseDate(item.date)) : [];
    } catch (error) {
      return [];
    }
  };

  const savePersonalItems = () => {
    localStorage.setItem(personalStorageKey, JSON.stringify(personalItems));
  };

  const validDateValue = (value) => (parseDate(value) ? value : '');

  const referenceValue = (competition, key) => {
    if (validDateValue(competition[key])) return competition[key];
    const nestedKey = key.replace(/^reference/, '');
    const normalized = nestedKey.charAt(0).toLowerCase() + nestedKey.slice(1);
    return validDateValue(competition.referenceDates?.[normalized]);
  };

  const dateInfo = (competition, currentKey, referenceKey) => {
    const current = validDateValue(competition[currentKey]);
    if (current) return { value: current, source: 'current' };

    const reference = referenceValue(competition, referenceKey);
    if (reference) return { value: reference, source: 'reference' };

    return { value: '', source: 'pending' };
  };

  const formatDateInfo = (info) => {
    if (info.source === 'current') return escapeHtml(info.value);
    if (info.source === 'reference') {
      return `${escapeHtml(info.value)}<span class="date-note">${referenceYear}年时间，今年暂未通知</span>`;
    }
    return '待官网确认';
  };

  const formatContestRange = (competition) => {
    const currentStart = validDateValue(competition.contestStart);
    if (currentStart) {
      const currentEnd = validDateValue(competition.contestEnd);
      const range = currentEnd && currentEnd !== currentStart ? `${currentStart} 至 ${currentEnd}` : currentStart;
      return escapeHtml(range);
    }

    const currentEnd = validDateValue(competition.contestEnd);
    if (currentEnd) return `${escapeHtml(currentEnd)}<span class="date-note">结束时间</span>`;

    const referenceStart = referenceValue(competition, 'referenceContestStart');
    if (referenceStart) {
      const referenceEnd = referenceValue(competition, 'referenceContestEnd');
      const range = referenceEnd && referenceEnd !== referenceStart ? `${referenceStart} 至 ${referenceEnd}` : referenceStart;
      return `${escapeHtml(range)}<span class="date-note">${referenceYear}年时间，今年暂未通知</span>`;
    }

    const referenceEnd = referenceValue(competition, 'referenceContestEnd');
    if (referenceEnd) {
      return `${escapeHtml(referenceEnd)}<span class="date-note">${referenceYear}年结束时间，今年暂未通知</span>`;
    }

    return '待官网确认';
  };

  const dateState = (competition) => {
    const infos = dateFields.map((field) => dateInfo(competition, field.current, field.reference));
    if (infos.some((info) => info.source === 'current')) {
      return {
        key: 'current',
        label: `${currentYear}年已确认`,
        dialogLabel: '已收录今年日程',
        listLabel: '今年时间已收录'
      };
    }
    if (infos.some((info) => info.source === 'reference')) {
      return {
        key: 'reference',
        label: `${referenceYear}参考`,
        dialogLabel: `使用${referenceYear}年参考时间`,
        listLabel: `${referenceYear}年时间参考，今年暂未通知`
      };
    }
    return {
      key: 'pending',
      label: '待官网确认',
      dialogLabel: '待官网确认',
      listLabel: '时间待官网确认'
    };
  };

  const calendarDate = (info, calendarYear) => {
    const date = parseDate(info.value);
    if (!date) return null;
    if (info.source === 'reference') return new Date(calendarYear, date.getMonth(), date.getDate());
    return date;
  };

  const competitionEventNodes = (competition, calendarYear) => {
    const nodes = [];
    dateFields.forEach((field) => {
      const info = dateInfo(competition, field.current, field.reference);
      const date = calendarDate(info, calendarYear);
      if (date) nodes.push({ label: field.label, date, competition, source: info.source, originalDate: info.value });
    });
    return nodes;
  };

  const personalEventNodes = () => personalItems
    .map((item) => {
      const date = parseDate(item.date);
      return date ? { label: item.type || '事务', date, personal: item, source: 'personal' } : null;
    })
    .filter(Boolean);

  const allEvents = (calendarYear) => [
    ...competitions.flatMap((competition) => competitionEventNodes(competition, calendarYear)),
    ...personalEventNodes()
  ];

  const renderScheduleStats = () => {
    const states = competitions.map((competition) => dateState(competition).key);
    countNode.textContent = competitions.length;
    currentCountNode.textContent = states.filter((state) => state === 'current').length;
    referenceCountNode.textContent = states.filter((state) => state === 'reference').length;
    pendingCountNode.textContent = states.filter((state) => state === 'pending').length;
  };

  const syncDialogLinks = ({ officialUrl = '', evidenceUrl = '' } = {}) => {
    if (officialUrl) {
      officialLink.hidden = false;
      officialLink.href = officialUrl;
      officialLink.textContent = '前往官网';
    } else {
      officialLink.hidden = true;
      officialLink.removeAttribute('href');
    }

    if (evidenceUrl) {
      evidenceLink.hidden = false;
      evidenceLink.href = evidenceUrl;
    } else {
      evidenceLink.hidden = true;
      evidenceLink.removeAttribute('href');
    }
  };

  const openDialog = (competition) => {
    const state = dateState(competition);
    activePersonalId = '';
    deletePersonalButton.hidden = true;
    dialogTitle.textContent = competition.name;
    dialogStatus.textContent = state.dialogLabel;
    dialogChips.innerHTML = '';
    [
      { text: competition.level || '待核对', className: 'tone-muted' },
      { text: competition.recognition || '待核对', className: recognitionClass(competition.recognition) },
      { text: state.label, className: `tone-${state.key}` }
    ].forEach((chip) => {
      const span = document.createElement('span');
      span.className = `schedule-chip ${chip.className}`;
      span.textContent = chip.text;
      dialogChips.appendChild(span);
    });

    const officialUrl = competition.officialUrl || '';
    const evidenceUrl = competition.evidenceUrl || competition.dateEvidenceUrl || '';
    const rows = [
      ['主办单位', escapeHtml(competition.organizer || '待核对')],
      ['2025年认定类别', escapeHtml(competition.recognition || '待核对')],
      ['竞赛级别', escapeHtml(competition.level || '待核对')],
      ['竞赛官网', officialUrl ? `<a href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(officialUrl)}</a>` : '待补充'],
      ['报名开始', formatDateInfo(dateInfo(competition, 'registrationStart', 'referenceRegistrationStart'))],
      ['报名截止', formatDateInfo(dateInfo(competition, 'registrationEnd', 'referenceRegistrationEnd'))],
      ['正式比赛', formatContestRange(competition)]
    ];

    if (evidenceUrl && evidenceUrl !== officialUrl) {
      rows.splice(4, 0, ['官方通知', `<a href="${escapeHtml(evidenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evidenceUrl)}</a>`]);
    }

    dialogDetails.innerHTML = rows.map(([term, detail]) => `<dt>${escapeHtml(term)}</dt><dd>${detail}</dd>`).join('');
    syncDialogLinks({ officialUrl, evidenceUrl });

    dialog.hidden = false;
    document.body.classList.add('dialog-open');
    dialog.querySelector('.dialog-close')?.focus();
  };

  const openPersonalDialog = (item) => {
    activePersonalId = item.id;
    dialogTitle.textContent = item.title;
    dialogStatus.textContent = '我的事务';
    dialogChips.innerHTML = '';

    const chip = document.createElement('span');
    chip.className = 'schedule-chip tone-personal';
    chip.textContent = item.type || '提醒';
    dialogChips.appendChild(chip);

    const rows = [
      ['日期', escapeHtml(item.date)],
      ['类型', escapeHtml(item.type || '提醒')],
      ['备注', escapeHtml(item.note || '无')]
    ];

    dialogDetails.innerHTML = rows.map(([term, detail]) => `<dt>${escapeHtml(term)}</dt><dd>${detail}</dd>`).join('');
    syncDialogLinks();
    deletePersonalButton.hidden = false;

    dialog.hidden = false;
    document.body.classList.add('dialog-open');
    dialog.querySelector('.dialog-close')?.focus();
  };

  const closeDialog = () => {
    dialog.hidden = true;
    document.body.classList.remove('dialog-open');
  };

  const renderCalendar = () => {
    const firstDay = new Date(visibleYear, visibleMonth, 1);
    const start = new Date(firstDay);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    start.setDate(firstDay.getDate() - mondayOffset);
    const monthEvents = allEvents(visibleYear).reduce((map, item) => {
      const key = dateKey(item.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
      return map;
    }, new Map());

    monthTitle.textContent = `${visibleYear} 年 ${String(visibleMonth + 1).padStart(2, '0')} 月`;
    grid.innerHTML = '';

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = dateKey(date);
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      if (date.getMonth() !== visibleMonth) cell.classList.add('is-muted');
      if (dateKey(date) === dateKey(today)) cell.classList.add('is-today');

      const day = document.createElement('span');
      day.className = 'calendar-day';
      day.textContent = date.getDate();
      cell.appendChild(day);

      const dayEvents = (monthEvents.get(key) || []).sort((a, b) => {
        if (a.source === b.source) return a.label.localeCompare(b.label, 'zh-Hans-CN');
        if (a.source === 'personal') return -1;
        if (b.source === 'personal') return 1;
        return 0;
      });

      dayEvents.slice(0, 3).forEach((event) => {
        const button = document.createElement('button');
        button.type = 'button';
        if (event.source === 'personal') {
          button.className = 'calendar-event personal-event';
          button.textContent = `${event.label} · ${event.personal.title}`;
          button.addEventListener('click', () => openPersonalDialog(event.personal));
        } else {
          button.className = `calendar-event ${recognitionClass(event.competition.recognition)}${event.source === 'reference' ? ' is-reference' : ''}`;
          button.textContent = `${event.source === 'reference' ? `${referenceYear}参考 · ` : ''}${event.label} · ${event.competition.name}`;
          if (event.source === 'reference') {
            button.title = `${event.originalDate} 是${referenceYear}年具体时间，今年还未通知`;
          }
          button.addEventListener('click', () => openDialog(event.competition));
        }
        cell.appendChild(button);
      });

      const extra = dayEvents.length - 3;
      if (extra > 0) {
        const more = document.createElement('span');
        more.className = 'calendar-more';
        more.textContent = `+${extra} more`;
        cell.appendChild(more);
      }

      grid.appendChild(cell);
    }
  };

  const renderPending = () => {
    const query = (searchInput.value || '').trim().toLowerCase();
    const level = levelSelect.value;
    const filtered = competitions.filter((item) => {
      const text = `${item.name} ${item.organizer} ${item.recognition}`.toLowerCase();
      return (!query || text.includes(query)) && (!level || item.recognition.includes(level));
    });

    pendingList.innerHTML = '';
    filtered.forEach((item) => {
      const state = dateState(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `pending-item is-${state.key}`;
      button.innerHTML = `
        <span class="schedule-chip ${recognitionClass(item.recognition)}">${escapeHtml(item.recognition || '待核对')}</span>
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.level || '待核对')} / ${escapeHtml(item.organizer || '主办单位待核对')}</small>
        <small class="pending-date-state">${escapeHtml(state.listLabel)}</small>
      `;
      button.addEventListener('click', () => openDialog(item));
      pendingList.appendChild(button);
    });

    if (filtered.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'pending-hint';
      hint.textContent = '没有匹配的竞赛。';
      pendingList.appendChild(hint);
    }
  };

  const renderPersonalList = () => {
    if (!personalList) return;
    personalList.innerHTML = '';

    if (personalItems.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'pending-hint';
      hint.textContent = '还没有添加事务。';
      personalList.appendChild(hint);
      return;
    }

    [...personalItems]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'personal-item';
        button.innerHTML = `
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.date)} / ${escapeHtml(item.type || '提醒')}</small>
        `;
        button.addEventListener('click', () => openPersonalDialog(item));
        personalList.appendChild(button);
      });
  };

  fetch(dataUrl)
    .then((response) => response.json())
    .then((data) => {
      referenceYear = Number(data.referenceYear || data.year || referenceYear);
      competitions = data.competitions || [];
      personalItems = loadPersonalItems();
      if (personalForm?.elements.date) personalForm.elements.date.value = dateKey(today);
      renderScheduleStats();
      renderCalendar();
      renderPending();
      renderPersonalList();
    })
    .catch(() => {
      pendingList.innerHTML = '<p class="pending-hint">日程数据加载失败，请稍后重试。</p>';
    });

  prevButton.addEventListener('click', () => {
    visibleMonth -= 1;
    if (visibleMonth < 0) {
      visibleMonth = 11;
      visibleYear -= 1;
    }
    renderCalendar();
  });

  nextButton.addEventListener('click', () => {
    visibleMonth += 1;
    if (visibleMonth > 11) {
      visibleMonth = 0;
      visibleYear += 1;
    }
    renderCalendar();
  });

  searchInput.addEventListener('input', renderPending);
  levelSelect.addEventListener('change', renderPending);
  personalForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(personalForm);
    const title = String(formData.get('title') || '').trim();
    const date = String(formData.get('date') || '').trim();
    if (!title || !parseDate(date)) return;
    personalItems.push({
      id: `task-${Date.now()}`,
      title,
      date,
      type: String(formData.get('type') || '提醒'),
      note: String(formData.get('note') || '').trim()
    });
    savePersonalItems();
    personalForm.reset();
    personalForm.elements.date.value = date;
    renderCalendar();
    renderPersonalList();
  });
  deletePersonalButton?.addEventListener('click', () => {
    if (!activePersonalId) return;
    personalItems = personalItems.filter((item) => item.id !== activePersonalId);
    activePersonalId = '';
    savePersonalItems();
    closeDialog();
    renderCalendar();
    renderPersonalList();
  });
  schedulePage.querySelectorAll('[data-schedule-close]').forEach((control) => {
    control.addEventListener('click', closeDialog);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.hidden) closeDialog();
  });
}
