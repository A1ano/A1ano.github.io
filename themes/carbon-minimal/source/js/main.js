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
  const updatedNode = schedulePage.querySelector('[data-schedule-updated]');
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

  let competitions = [];
  const today = new Date();
  let visibleYear = today.getFullYear();
  let visibleMonth = today.getMonth();

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

  const formatDate = (value) => value || '待官网确认';

  const eventNodes = (competition) => {
    const nodes = [];
    [
      ['报名开始', competition.registrationStart],
      ['报名截止', competition.registrationEnd],
      ['正式比赛', competition.contestStart]
    ].forEach(([label, value]) => {
      const date = parseDate(value);
      if (date) nodes.push({ label, date, competition });
    });
    return nodes;
  };

  const allEvents = () => competitions.flatMap(eventNodes);

  const openDialog = (competition) => {
    dialogTitle.textContent = competition.name;
    dialogStatus.textContent = competition.status === 'pending-official-date' ? '待官网确认' : '已收录日程';
    dialogChips.innerHTML = '';
    [competition.level, competition.recognition, competition.status === 'pending-official-date' ? '待官网通知' : '已确认'].forEach((chip) => {
      const span = document.createElement('span');
      span.className = `schedule-chip ${recognitionClass(competition.recognition)}`;
      span.textContent = chip || '待核对';
      dialogChips.appendChild(span);
    });

    const rows = [
      ['序号', competition.number],
      ['主办单位', competition.organizer || '待核对'],
      ['2025年认定类别', competition.recognition || '待核对'],
      ['竞赛级别', competition.level || '待核对'],
      ['报名开始', formatDate(competition.registrationStart)],
      ['报名截止', formatDate(competition.registrationEnd)],
      ['正式比赛', formatDate(competition.contestStart)],
      ['数据说明', competition.notes || '以官网通知为准']
    ];

    dialogDetails.innerHTML = rows.map(([term, detail]) => `<dt>${term}</dt><dd>${detail}</dd>`).join('');

    if (competition.officialUrl) {
      officialLink.hidden = false;
      officialLink.href = competition.officialUrl;
    } else {
      officialLink.hidden = true;
      officialLink.removeAttribute('href');
    }

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
    const monthEvents = allEvents().reduce((map, item) => {
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

      (monthEvents.get(key) || []).slice(0, 3).forEach((event) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `calendar-event ${recognitionClass(event.competition.recognition)}`;
        button.textContent = `${event.label} · ${event.competition.name}`;
        button.addEventListener('click', () => openDialog(event.competition));
        cell.appendChild(button);
      });

      const extra = (monthEvents.get(key) || []).length - 3;
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
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pending-item';
      button.innerHTML = `
        <span class="schedule-chip ${recognitionClass(item.recognition)}">${item.recognition || '待核对'}</span>
        <strong>${item.name}</strong>
        <small>${item.level || '待核对'} / ${item.organizer || '主办单位待核对'}</small>
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

  fetch(dataUrl)
    .then((response) => response.json())
    .then((data) => {
      competitions = data.competitions || [];
      countNode.textContent = competitions.length;
      updatedNode.textContent = data.updatedAt ? `更新于 ${data.updatedAt}` : data.notice || '等待官网时间';
      renderCalendar();
      renderPending();
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
  schedulePage.querySelectorAll('[data-schedule-close]').forEach((control) => {
    control.addEventListener('click', closeDialog);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dialog.hidden) closeDialog();
  });
}
