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
