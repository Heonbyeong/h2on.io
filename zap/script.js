(() => {
  const shape = document.querySelector('.notch-shape');
  if (!shape) return;

  const path = shape.querySelector('.notch-fill');
  const body = shape.querySelector('.notch-body');
  if (!path || !body) return;

  // NotchShape paths (viewBox 384×100).
  // Compact: 200폭 본체 + 0 wing + bottomRadius 10. 좌우 92px 여백으로 가운데 정렬.
  // Expanded: 360폭 본체 + 12 wing + bottomRadius 22. 좌우 0 (full width).
  const COMPACT_D =
    'M92 0 L292 0 L292 22 Q292 32 282 32 L102 32 Q92 32 92 22 Z';
  const EXPANDED_D =
    'M0 0 Q12 0 12 12 L12 78 Q12 100 34 100 L350 100 Q372 100 372 78 L372 12 Q372 0 384 0 Z';

  const setState = (state) => {
    if (state === 'expanded') {
      path.setAttribute('d', EXPANDED_D);
      body.style.opacity = '1';
      shape.dataset.state = 'expanded';
    } else {
      path.setAttribute('d', COMPACT_D);
      body.style.opacity = '0';
      shape.dataset.state = 'compact';
    }
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    setState('expanded');
    return;
  }

  setState('compact');

  let inView = false;
  let timer = null;

  const schedule = (fn, ms) => {
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, ms);
  };

  const cycle = () => {
    if (!inView) return;
    setState('expanded');
    schedule(() => {
      setState('compact');
      schedule(cycle, 2400);
    }, 3800);
  };

  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !timer) {
        schedule(cycle, 500);
      } else if (!inView && timer) {
        clearTimeout(timer);
        timer = null;
        setState('compact');
      }
    },
    { threshold: 0.4 }
  ).observe(shape);
})();

// ─────────────────────────────────────────────────────────────
// [data-stagger] 텍스트를 글자별 .ch span 으로 split.
// HTML 에는 한 줄로 두고 ("Hello, Zap!"), 여기서 글자별로 쪼개 --i 인덱스를 주면
// CSS 가 글자 i 의 등장 timing(start = 0.18 + i*0.02) 을 자동 계산해서 stagger.
// no-JS 환경에서는 split 이 안 되어 원문 그대로 표시되는 안전한 fallback.
// ─────────────────────────────────────────────────────────────
(() => {
  document.querySelectorAll('[data-stagger]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.style.setProperty('--i', i);
      // 일반 공백은 NBSP(\u00A0) 로 — 텍스트 노드에서 trim/collapse 되는 환경 차이를 차단.
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      el.appendChild(span);
    });
  });
})();

// ─────────────────────────────────────────────────────────────
// Hero scrolly — lerp 기반 스크럽. CSS animation 들은 paused 상태에서
// animation-delay 가 var(--story-progress) 에 묶여 있어, 매 frame 변수만
// 업데이트 하면 keyframe 위치가 부드럽게 따라간다. lerp factor 가 인터셔(관성).
// ─────────────────────────────────────────────────────────────
(() => {
  const scrolly = document.querySelector('.scrolly');
  if (!scrolly) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LERP = 0.1;        // 작을수록 더 느긋한 인터셔. 0.08–0.15 권장.
  const EPSILON = 0.0005;  // 이 차이 미만이면 따라잡기 종료.

  let current = 0;
  let target = 0;
  let raf = 0;

  const compute = () => {
    const rect = scrolly.getBoundingClientRect();
    const total = scrolly.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    const raw = -rect.top / total;
    return Math.max(0, Math.min(1, raw));
  };

  const apply = (v) => {
    scrolly.style.setProperty('--story-progress', v.toFixed(4));
  };

  const tick = () => {
    const diff = target - current;
    if (Math.abs(diff) < EPSILON) {
      current = target;
      apply(current);
      raf = 0;
      return;
    }
    current += diff * LERP;
    apply(current);
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    target = compute();
    if (reduced) {
      // 모션 감소 모드: 즉시 동기화. 인터셔 없음.
      current = target;
      apply(current);
      return;
    }
    start();
  };

  // 초기 progress 동기화 — 새로고침으로 페이지 중간에서 시작해도 깜빡임 없음.
  target = current = compute();
  apply(current);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
})();
