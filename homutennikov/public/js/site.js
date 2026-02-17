(() => {
  const onReady = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  };

  onReady(() => {
    const btn = document.querySelector('[data-nav-toggle]');
    const nav = document.querySelector('[data-nav]');
    const overlay = document.querySelector('[data-nav-overlay]');

    if (!btn || !nav || !overlay) return;

    const OPEN_CLASS = 'nav-open';

    const setOpen = (open) => {
      document.body.classList.toggle(OPEN_CLASS, open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (open) {
        overlay.hidden = false;
        document.documentElement.classList.add('scroll-lock');
        document.body.classList.add('scroll-lock');
      } else {
        overlay.hidden = true;
        document.documentElement.classList.remove('scroll-lock');
        document.body.classList.remove('scroll-lock');
      }
    };

    const isOpen = () => document.body.classList.contains(OPEN_CLASS);

    btn.addEventListener('click', () => setOpen(!isOpen()));
    overlay.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    nav.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const link = target.closest('a');
      const btnLike = target.closest('button');

      if (link) setOpen(false);

      if (btnLike && btnLike.type === 'submit') setOpen(false);
    });

    const mq = window.matchMedia('(min-width: 861px)');
    const onMQ = () => {
      if (mq.matches) setOpen(false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onMQ);
    else mq.addListener(onMQ);
  });
})();
