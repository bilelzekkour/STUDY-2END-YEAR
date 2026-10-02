(function () {
  'use strict';

  const DATA = window.STUDY_DATA;
  const main = document.getElementById('main-content');
  const STORAGE_KEY = 'madar-public-finance-progress-v1';
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

  const allCards = DATA.lessons.flatMap((lesson) => lesson.cards.map((card, index) => ({
    ...card,
    id: `${lesson.id}-card-${index + 1}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonNumber: lesson.number
  })));
  const allQuestions = DATA.lessons.flatMap((lesson) => lesson.quiz.map((question, index) => ({
    ...question,
    id: `${lesson.id}-quiz-${index + 1}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lessonNumber: lesson.number
  })));

  function defaultState() {
    return { completedLessons: [], masteredCards: [], quizAttempts: 0, bestScore: null, lastLessonId: null };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || typeof saved !== 'object') return defaultState();
      return {
        completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons.filter((id) => DATA.lessons.some((lesson) => lesson.id === id)) : [],
        masteredCards: Array.isArray(saved.masteredCards) ? saved.masteredCards.filter((id) => allCards.some((card) => card.id === id)) : [],
        quizAttempts: Number.isFinite(saved.quizAttempts) ? Math.max(0, saved.quizAttempts) : 0,
        bestScore: Number.isFinite(saved.bestScore) ? saved.bestScore : null,
        lastLessonId: DATA.lessons.some((lesson) => lesson.id === saved.lastLessonId) ? saved.lastLessonId : null
      };
    } catch (error) {
      return defaultState();
    }
  }

  let state = loadState();
  let currentView = 'home';
  let activeLessonId = null;
  let activeExamId = null;
  let cardSession = null;
  let cardSummary = null;
  let quizSession = null;

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { /* file:// privacy settings may disable storage */ }
    updateSidebar();
  }

  function digits(value) {
    return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)]);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function pdfUrl(filename) {
    return encodeURIComponent(filename);
  }

  function pdfLink(filename, label) {
    return `<a class="btn btn-soft btn-small" href="${pdfUrl(filename)}" target="_blank" rel="noopener">${escapeHtml(label || 'افتح ملف PDF')} <span aria-hidden="true">↗</span></a>`;
  }

  function findLesson(id) { return DATA.lessons.find((lesson) => lesson.id === id); }
  function findExam(id) { return DATA.exams.find((exam) => exam.id === id); }
  function isDone(id) { return state.completedLessons.includes(id); }
  function progressPercent() { return Math.round((state.completedLessons.length / DATA.lessons.length) * 100); }

  function updateSidebar() {
    const percent = progressPercent();
    const label = document.getElementById('side-progress-label');
    const bar = document.getElementById('side-progress-bar');
    const note = document.getElementById('side-progress-note');
    if (label) label.textContent = `${digits(percent)}٪`;
    if (bar) bar.style.width = `${percent}%`;
    if (note) note.textContent = state.completedLessons.length
      ? `أنجزت ${digits(state.completedLessons.length)} من ${digits(DATA.lessons.length)} محاضرات`
      : 'ابدأ بمحاضرة واحدة اليوم';
  }

  function setView(view) {
    currentView = view;
    activeLessonId = null;
    activeExamId = null;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === currentView);
    });
    if (currentView === 'home') main.innerHTML = renderHome();
    else if (currentView === 'lessons') main.innerHTML = activeLessonId ? renderLessonDetail(findLesson(activeLessonId)) : renderLessons();
    else if (currentView === 'cards') main.innerHTML = renderCards();
    else if (currentView === 'quiz') main.innerHTML = renderQuiz();
    else if (currentView === 'exams') main.innerHTML = activeExamId ? renderExamDetail(findExam(activeExamId)) : renderExams();
    else if (currentView === 'search') main.innerHTML = renderSearch(document.getElementById('search-input').value.trim());
    else main.innerHTML = renderHome();
    updateSidebar();
  }

  function lessonRow(lesson) {
    const complete = isDone(lesson.id);
    return `<button class="lesson-row" type="button" data-open-lesson="${lesson.id}">
      <span class="lesson-number">${lesson.number}</span>
      <span class="lesson-row-copy"><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.short)}</small></span>
      <span class="lesson-state ${complete ? 'done' : ''}"><i class="state-dot" aria-hidden="true"></i>${complete ? 'مكتملة' : 'ابدأ'}</span>
    </button>`;
  }

  function renderHome() {
    const completed = state.completedLessons.length;
    const continueLesson = findLesson(state.lastLessonId) || DATA.lessons[0];
    const percent = progressPercent();
    return `<section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <span class="eyebrow">مساحة مراجعة شخصية · ثماني محاضرات</span>
        <h1 id="hero-title">المالية العامة،<br>خطوة أوضح كل يوم.</h1>
        <p>ملخصات من محاضراتك، بطاقات للاسترجاع النشط، وأسئلة على نمط النماذج. ادرس بهدوء — من دون حساب أو اتصال بخدمة خارجية.</p>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" data-action="continue">تابع التعلّم <span aria-hidden="true">←</span></button>
          <button class="btn btn-light" type="button" data-view="quiz">ابدأ اختبارًا قصيرًا</button>
        </div>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="hero-orbit"></div>
        <div class="hero-seal"><span>مراجعة</span><strong>م</strong><span>مالية عامة</span></div>
        <span class="hero-float one">فهم · تذكّر · تطبيق</span>
        <span class="hero-float two">تقدّمك ${digits(percent)}٪</span>
      </div>
    </section>

    <section class="stats-grid" aria-label="ملخص المقرر">
      <div class="stat-card"><span class="stat-icon" aria-hidden="true">▦</span><span><strong>${digits(DATA.lessons.length)}</strong><small>محاضرات مرتبة</small></span></div>
      <div class="stat-card"><span class="stat-icon" aria-hidden="true">◇</span><span><strong>${digits(allCards.length)}</strong><small>بطاقة استرجاع</small></span></div>
      <div class="stat-card"><span class="stat-icon" aria-hidden="true">◉</span><span><strong>${digits(allQuestions.length)}</strong><small>سؤال تدريبي</small></span></div>
    </section>

    <div class="content-grid">
      <div class="content-stack">
        <section class="section-block">
          <div class="section-heading"><div><span class="eyebrow">خريطة المقياس</span><h2>من المفاهيم إلى الميزانية</h2><p>ابدأ بالترتيب، أو اختر المحور الذي تحتاج إلى مراجعته.</p></div><button class="text-button" type="button" data-view="lessons">عرض المحاضرات كاملة ←</button></div>
          <div class="lesson-list">${DATA.lessons.slice(0, 4).map(lessonRow).join('')}</div>
        </section>
        <section class="section-block">
          <div class="section-heading"><div><span class="eyebrow">تدرّب بذكاء</span><h2>ما الذي يتكرر في النماذج؟</h2></div><button class="text-button" type="button" data-view="exams">تحليل النماذج ←</button></div>
          <div class="panel exam-teaser">${DATA.exams.map((exam) => `<div class="exam-teaser-row"><span><strong>${escapeHtml(exam.title)}</strong><small>${escapeHtml(exam.shape)}</small></span><span class="exam-year-pill">${escapeHtml(exam.points)}</span></div>`).join('')}</div>
        </section>
      </div>
      <aside class="content-stack side-extras">
        <section class="continue-card">
          <span class="eyebrow">${completed ? `تقدّمك ${digits(completed)} من ${digits(DATA.lessons.length)}` : 'اقتراح البداية'}</span>
          <h3>${completed ? 'واصل من حيث توقفت' : 'ابدأ من أساس المقياس'}</h3>
          <p>${escapeHtml(continueLesson.number)} · ${escapeHtml(continueLesson.title)}<br>${escapeHtml(continueLesson.short)}</p>
          <button class="btn btn-green btn-small" type="button" data-action="continue">افتح المحاضرة <span aria-hidden="true">←</span></button>
        </section>
        <section class="panel">
          <div class="section-heading"><div><span class="eyebrow">جلسة قصيرة</span><h2>طريقة مراجعة مقترحة</h2></div></div>
          <div class="rhythm-list">
            <div class="rhythm-item"><span class="rhythm-time">١٥ د</span><span>اقرأ الملخص وحدد الفكرة الأساسية.</span></div>
            <div class="rhythm-item"><span class="rhythm-time">١٠ د</span><span>استرجع التعريفات ببطاقات المراجعة.</span></div>
            <div class="rhythm-item"><span class="rhythm-time">١٠ د</span><span>حلّ أسئلة قصيرة دون الرجوع للملاحظات.</span></div>
          </div>
        </section>
        <section class="panel">
          <div class="section-heading"><div><span class="eyebrow">حفظ على جهازك</span><h2>متابعة تقدّمك</h2></div><strong class="pill">${digits(percent)}٪</strong></div>
          <div class="progress-track"><span style="width:${percent}%"></span></div>
          <p class="page-lead">أكملت ${digits(completed)} من ${digits(DATA.lessons.length)} محاضرات. حالة البطاقات ونتيجتك تُحفظ في هذا المتصفح.</p>
          <button class="text-button" type="button" data-action="reset-progress" style="margin-top:10px">إعادة ضبط التقدّم</button>
        </section>
      </aside>
    </div>`;
  }

  function renderLessons() {
    return `<div class="page-heading"><div><span class="eyebrow">خريطة التعلّم</span><h1 class="page-title">محاضرات المقياس</h1><p class="page-lead">ثمانية محاور من مدخل المالية العامة إلى قواعد الميزانية.</p></div>
      <span class="pill">${digits(state.completedLessons.length)} / ${digits(DATA.lessons.length)} مكتملة</span></div>
      <div class="lesson-grid">${DATA.lessons.map((lesson) => `<button class="lesson-card" type="button" data-open-lesson="${lesson.id}">
        <div class="lesson-card-top"><span class="lesson-number">${lesson.number}</span><span class="pill">${escapeHtml(lesson.label)}</span></div>
        <h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.short)}</p>
        <div class="lesson-card-bottom"><span>${escapeHtml(lesson.pages)} من الملف الأصلي</span><span class="${isDone(lesson.id) ? 'done-label' : ''}">${isDone(lesson.id) ? '✓ تمت المراجعة' : 'افتح المحور ←'}</span></div>
      </button>`).join('')}</div>`;
  }

  function renderLessonDetail(lesson) {
    if (!lesson) return renderLessons();
    state.lastLessonId = lesson.id;
    saveState();
    const completed = isDone(lesson.id);
    return `<button class="back-button" type="button" data-action="back-lessons">→ العودة إلى المحاضرات</button>
      <div class="lesson-detail-head"><span class="lesson-number">${lesson.number}</span><span><span class="eyebrow">${escapeHtml(lesson.label)} · ${escapeHtml(lesson.pages)}</span><h1 class="lesson-detail-title">${escapeHtml(lesson.title)}</h1><p class="lesson-detail-short">${escapeHtml(lesson.short)}</p></span></div>
      <div class="content-grid">
        <div class="content-stack">
          <section class="summary-box"><strong>الخلاصة في دقيقة</strong>${escapeHtml(lesson.summary)}</section>
          <section class="panel"><div class="section-heading"><div><span class="eyebrow">النقاط الأساسية</span><h2>ما ينبغي أن تتذكره</h2></div></div><ul class="point-list">${lesson.points.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul></section>
          <section class="panel"><div class="section-heading"><div><span class="eyebrow">مفاهيم مفتاحية</span><h2>تعريفات للمراجعة</h2></div></div><div class="term-list">${lesson.terms.map((term) => `<div class="term-item"><strong>${escapeHtml(term.term)}</strong><p>${escapeHtml(term.meaning)}</p></div>`).join('')}</div></section>
        </div>
        <aside class="content-stack side-extras">
          <section class="panel"><div class="section-heading"><div><span class="eyebrow">تطبيق امتحاني</span><h2>لمحة من النماذج</h2></div></div><div class="exam-hint">${escapeHtml(lesson.examHint)}</div></section>
          <section class="panel"><div class="section-heading"><div><span class="eyebrow">المصدر</span><h2>ارجع إلى المحاضرة</h2></div></div><p class="page-lead">المرجع هو رقم الصفحة داخل ملف PDF المرفوع.</p><div class="source-line"><span>${escapeHtml(lesson.pages)}</span>${pdfLink(lesson.pdf, 'فتح المحاضرة')}</div></section>
          <section class="panel"><div class="section-heading"><div><span class="eyebrow">خطوتك التالية</span><h2>ثبّت ما تعلمته</h2></div></div><div class="detail-actions"><button class="btn btn-green" type="button" data-start-cards="lesson" data-lesson-id="${lesson.id}">راجع بطاقات المحور</button><button class="btn btn-outline" type="button" data-start-quiz="${lesson.id}">اختبر هذا المحور</button><button class="btn ${completed ? 'btn-soft' : 'btn-outline'}" type="button" data-action="toggle-complete" data-lesson-id="${lesson.id}">${completed ? '✓ أزل علامة الإكمال' : 'علّم المحور كمكتمل'}</button></div></section>
        </aside>
      </div>`;
  }

  function renderCards() {
    if (cardSession) return renderCardSession();
    if (cardSummary) {
      const summary = cardSummary;
      const allDone = summary.total === 0;
      return `<div class="page-heading"><div><span class="eyebrow">مراجعة نشطة</span><h1 class="page-title">${allDone ? 'كل البطاقات متقنة!' : 'أحسنت، أنهيت هذه الجولة'}</h1><p class="page-lead">الاسترجاع المتكرر يساعدك على تثبيت التعريفات والأفكار.</p></div></div>
        <section class="panel" style="max-width:700px"><div class="result-score">${digits(summary.mastered)}<small>بطاقة متقنة</small></div><p class="page-lead">${allDone ? 'لا توجد بطاقات تحتاج إلى مراجعة الآن.' : `راجعت ${digits(summary.total)} بطاقة في هذه الجولة.`}</p><div class="detail-actions">${allDone ? '' : '<button class="btn btn-green" type="button" data-start-cards="review">راجع البطاقات غير المتقنة</button>'}<button class="btn btn-outline" type="button" data-start-cards="all">ابدأ جولة كاملة</button><button class="btn btn-outline" type="button" data-action="clear-card-summary">عودة إلى خيارات البطاقات</button></div></section>`;
    }
    const notMastered = allCards.filter((card) => !state.masteredCards.includes(card.id)).length;
    return `<div class="page-heading"><div><span class="eyebrow">استرجاع نشط</span><h1 class="page-title">بطاقات المراجعة</h1><p class="page-lead">اقرأ السؤال، حاول الإجابة من ذاكرتك، ثم اكشف الإجابة وقيّم نفسك.</p></div><span class="pill">${digits(state.masteredCards.length)} / ${digits(allCards.length)} متقنة</span></div>
      <div class="cards-start-grid">
        <section class="practice-choice"><span class="choice-icon" aria-hidden="true">◇</span><h2>جولة كاملة</h2><p>مجموعة مختلطة من جميع المحاضرات. علّم البطاقة متقنة عندما تستطيع استرجاع جوابها.</p><button class="btn btn-green" type="button" data-start-cards="all">ابدأ ${digits(allCards.length)} بطاقة</button></section>
        <section class="practice-choice"><span class="choice-icon" aria-hidden="true">↻</span><h2>راجع ما لم تتقنه</h2><p>ركّز على البطاقات التي لم تضع عليها علامة «متقنة» بعد.</p><button class="btn btn-outline" type="button" data-start-cards="review" ${notMastered === 0 ? 'disabled' : ''}>ابدأ ${digits(notMastered)} بطاقة</button></section>
      </div>
      <div class="source-warning" style="max-width:820px">تُحفظ علامة إتقان البطاقة في متصفحك على هذا الجهاز. لا تُرسل إجاباتك إلى أي مكان.</div>`;
  }

  function renderCardSession() {
    if (!cardSession || !cardSession.cards.length) return renderCards();
    const card = cardSession.cards[cardSession.index];
    const mastered = state.masteredCards.includes(card.id);
    const sessionTitle = cardSession.lessonId ? findLesson(cardSession.lessonId).title : (cardSession.mode === 'review' ? 'البطاقات غير المتقنة' : 'جولة كاملة');
    return `<div class="flashcard-shell">
      <div class="flashcard-toolbar"><button class="back-button" style="margin:0" type="button" data-action="leave-cards">→ إنهاء الجولة</button><span>${escapeHtml(sessionTitle)}</span><span>${digits(cardSession.index + 1)} / ${digits(cardSession.cards.length)}</span></div>
      <div class="progress-track"><span style="width:${Math.round(((cardSession.index + 1) / cardSession.cards.length) * 100)}%"></span></div>
      <section class="flashcard" aria-live="polite"><span class="flashcard-label">${escapeHtml(card.lessonNumber)} · ${escapeHtml(card.lessonTitle)}</span><h1 class="flashcard-question">${escapeHtml(card.q)}</h1>
        ${cardSession.revealed ? `<div class="flashcard-answer">${escapeHtml(card.a)}</div><span class="flashcard-ref">${escapeHtml(card.ref)} · من ملف المحاضرة</span>` : `<p class="page-lead">حاول أن تستحضر الجواب قبل كشفه.</p>`}
        <div class="flashcard-actions">${cardSession.revealed
          ? `<button class="btn btn-soft" type="button" data-card-next="no">أحتاج إلى مراجعتها</button><button class="btn btn-green" type="button" data-card-next="yes">${mastered ? 'متقنة ✓ · التالي' : 'أتقنتها · التالي'}</button>`
          : `<button class="btn btn-green" type="button" data-action="reveal-card">اكشف الإجابة</button>`}</div>
      </section>
      <p class="page-lead" style="margin:12px auto 0;text-align:center">${digits(state.masteredCards.length)} بطاقة متقنة من ${digits(allCards.length)}</p>
    </div>`;
  }

  function renderQuiz() {
    if (quizSession) return quizSession.finished ? renderQuizResult() : renderQuizQuestion();
    const best = state.bestScore == null ? 'لم تدخل اختبارًا بعد' : `أفضل نتيجة: ${digits(state.bestScore)} إجابات صحيحة`;
    return `<div class="page-heading"><div><span class="eyebrow">تطبيق سريع</span><h1 class="page-title">اختبر نفسك</h1><p class="page-lead">أسئلة قصيرة مستندة إلى مفاهيم المحاضرات، مع تفسير بعد كل إجابة.</p></div><span class="pill">${escapeHtml(best)}</span></div>
      <section class="panel quiz-panel"><div class="section-heading"><div><span class="eyebrow">اختر نقطة البداية</span><h2>جولة من بنك الأسئلة</h2><p>تظهر الأسئلة بترتيب عشوائي، ويمكنك تخصيصها لمحاضرة واحدة.</p></div></div>
        <div class="quiz-controls"><div class="form-field"><label for="quiz-filter">المحور</label><select id="quiz-filter"><option value="all">كل المحاضرات</option>${DATA.lessons.map((lesson) => `<option value="${lesson.id}">${lesson.number} · ${escapeHtml(lesson.title)}</option>`).join('')}</select></div><button class="btn btn-green" type="button" data-action="start-quiz">ابدأ الاختبار</button></div>
      </section>
      <div class="source-warning" style="max-width:820px">أجب أولًا من ذاكرتك، ثم اقرأ التفسير. الأسئلة هنا للتدريب والمراجعة وليست بديلًا عن صياغة الأستاذ أو ملف المحاضرة.</div>`;
  }

  function renderQuizQuestion() {
    const session = quizSession;
    const item = session.questions[session.index];
    const selected = session.selected;
    const letters = ['أ', 'ب', 'ج', 'د'];
    const options = item.options.map((option, index) => {
      let status = '';
      if (session.answered && index === item.correct) status = 'correct';
      else if (session.answered && index === selected) status = 'incorrect';
      return `<button class="answer-option ${status}" type="button" data-answer-index="${index}" ${session.answered ? 'disabled' : ''}><span class="answer-letter">${letters[index] || digits(index + 1)}</span><span>${escapeHtml(option)}</span></button>`;
    }).join('');
    return `<div class="page-heading"><div><span class="eyebrow">${escapeHtml(item.lessonNumber)} · ${escapeHtml(item.lessonTitle)}</span><h1 class="page-title">سؤال ${digits(session.index + 1)}</h1></div><button class="text-button" type="button" data-action="leave-quiz">إنهاء الاختبار</button></div>
      <div class="progress-track" style="max-width:820px"><span style="width:${Math.round(((session.index + (session.answered ? 1 : 0)) / session.questions.length) * 100)}%"></span></div>
      <section class="question-card"><div class="question-meta"><span>${digits(session.index + 1)} من ${digits(session.questions.length)} أسئلة</span><span>${escapeHtml(item.ref)}</span></div><h2 class="question-title">${escapeHtml(item.q)}</h2><div class="answer-options">${options}</div>
        ${session.answered ? `<div class="quiz-feedback ${selected === item.correct ? 'correct' : 'incorrect'}"><strong>${selected === item.correct ? 'إجابة صحيحة' : 'راجع هذه الفكرة'}</strong><br>${escapeHtml(item.why)}</div>` : ''}
        <div class="quiz-footer"><span class="page-lead">الإجابات الصحيحة: ${digits(session.score)}</span>${session.answered ? `<button class="btn btn-green btn-small" type="button" data-action="next-question">${session.index + 1 === session.questions.length ? 'عرض النتيجة' : 'السؤال التالي ←'}</button>` : ''}</div>
      </section>`;
  }

  function renderQuizResult() {
    const session = quizSession;
    const total = session.questions.length;
    const score = session.score;
    const pct = Math.round((score / total) * 100);
    let note = pct >= 80 ? 'ممتاز — ثبّت المعلومات بمراجعة المحور بعد فترة.' : (pct >= 50 ? 'بداية جيدة — راجع الأسئلة التي أخطأت فيها ثم أعد المحاولة.' : 'لا بأس — عد إلى ملخص المحور واستخدم البطاقات قبل إعادة الاختبار.');
    return `<div class="page-heading"><div><span class="eyebrow">انتهت الجولة</span><h1 class="page-title">نتيجتك</h1><p class="page-lead">${escapeHtml(note)}</p></div></div>
      <section class="panel quiz-panel"><div class="result-score">${digits(score)}<small>من ${digits(total)}</small></div><p class="page-lead">${digits(pct)}٪ إجابات صحيحة</p><div class="detail-actions"><button class="btn btn-green" type="button" data-action="restart-quiz">اختبار جديد</button><button class="btn btn-outline" type="button" data-view="cards">انتقل إلى البطاقات</button></div></section>`;
  }

  function renderExams() {
    return `<div class="page-heading"><div><span class="eyebrow">مراجعة واقعية</span><h1 class="page-title">نماذج الامتحان</h1><p class="page-lead">حلّل نمط الأسئلة، جرّب الإجابة أولًا، ثم اكشف مخططًا مختصرًا للحل.</p></div><span class="pill">${digits(DATA.exams.length)} نموذجان مرفوعان</span></div>
      <div class="exam-grid">${DATA.exams.map((exam) => `<article class="exam-card"><div class="exam-card-top"><span class="pill">الدورة العادية</span><span class="exam-year-pill">${escapeHtml(exam.points)}</span></div><h2>${escapeHtml(exam.title)}</h2><p>${escapeHtml(exam.shape)}</p><div class="exam-card-bottom"><span class="page-lead">مبني على ملف الإجابة النموذجية</span><button class="btn btn-green btn-small" type="button" data-open-exam="${exam.id}">ابدأ المراجعة ←</button></div></article>`).join('')}</div>
      <div class="source-warning">النماذج المرفوعة موسومة بالإجابة النموذجية؛ التمرين هنا يدرّب على المحاور وطريقة بناء الإجابة. راجع ملف PDF الأصلي عند الحاجة إلى النص الكامل.</div>`;
  }

  function renderExamDetail(exam) {
    if (!exam) return renderExams();
    return `<button class="back-button" type="button" data-action="back-exams">→ العودة إلى النماذج</button>
      <div class="exam-detail-top"><div><span class="eyebrow">تحليل نموذج · ${escapeHtml(exam.year)}</span><h1>${escapeHtml(exam.title)}</h1><p>${escapeHtml(exam.shape)}</p></div>${pdfLink(exam.pdf, 'فتح ملف الإجابة الأصلي')}</div>
      <section class="panel" style="margin-bottom:16px"><div class="section-heading"><div><span class="eyebrow">طريقة التدريب</span><h2>حاول قبل أن تكشف الإجابة</h2></div><span class="pill">${escapeHtml(exam.points)}</span></div><p class="page-lead">اقرأ المطلوب، اكتب إجابتك في ورقة أو من الذاكرة، ثم افتح كل سؤال لمقارنة عناصر إجابتك بالمخطط.</p></section>
      <div class="exam-question-list">${exam.questions.map((question, index) => `<details class="exam-question"><summary><strong>${escapeHtml(question.title)}</strong><span>${escapeHtml(question.score)}　＋</span></summary><div class="exam-question-content"><p><strong>المطلوب:</strong> ${escapeHtml(question.prompt)}</p><div class="exam-answer-title">مخطط الإجابة</div><ul>${question.outline.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul><p class="exam-tip"><strong>تلميح للمراجعة:</strong> ${escapeHtml(question.tip)}</p></div></details>`).join('')}</div>
      <div class="source-line" style="max-width:900px"><span>المرجع: نموذج الإجابة ${escapeHtml(exam.year)} · الصفحات 1–2</span>${pdfLink(exam.pdf, 'افتح نسخة PDF')}</div>`;
  }

  function normalizeText(text) {
    return String(text || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function renderSearch(query) {
    const needle = normalizeText(query);
    if (!needle) return `<div class="page-heading"><div><span class="eyebrow">بحث في محتوى المقرر</span><h1 class="page-title">ابحث عن مفهوم</h1><p class="page-lead">اكتب كلمة أو عبارة في مربع البحث أعلى الصفحة.</p></div></div><div class="empty-state">جرّب مثلًا: <strong>الميزانية · الجبر المعنوي · القرض الخارجي</strong></div>`;
    const results = [];
    DATA.lessons.forEach((lesson) => {
      const corpus = [lesson.title, lesson.short, lesson.summary, lesson.points.join(' '), lesson.terms.map((term) => `${term.term} ${term.meaning}`).join(' ')].join(' ');
      if (normalizeText(corpus).includes(needle)) {
        const termMatch = lesson.terms.find((term) => normalizeText(`${term.term} ${term.meaning}`).includes(needle));
        results.push({ title: termMatch ? termMatch.term : lesson.title, subtitle: termMatch ? termMatch.meaning : lesson.short, kind: 'محاضرة', action: 'lesson', id: lesson.id });
      }
    });
    DATA.exams.forEach((exam) => {
      const corpus = [exam.title, exam.shape, exam.questions.map((question) => `${question.prompt} ${question.outline.join(' ')}`).join(' ')].join(' ');
      if (normalizeText(corpus).includes(needle)) results.push({ title: exam.title, subtitle: exam.shape, kind: 'نموذج امتحان', action: 'exam', id: exam.id });
    });
    const safeQuery = escapeHtml(query);
    return `<div class="page-heading"><div><span class="eyebrow">نتائج البحث</span><h1 class="page-title">بحث عن «${safeQuery}»</h1><p class="page-lead">${digits(results.length)} نتيجة في الملخصات والتعاريف ونماذج الإجابة.</p></div></div>
      ${results.length ? `<div class="search-results">${results.map((result) => `<button class="search-result" type="button" ${result.action === 'lesson' ? `data-open-lesson="${result.id}"` : `data-open-exam="${result.id}"`}><span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.subtitle)}</small></span><span class="search-kind">${escapeHtml(result.kind)}　←</span></button>`).join('')}</div>` : `<div class="empty-state"><strong>لم نعثر على نتيجة بهذه العبارة.</strong>جرّب كلمة أقصر أو مرادفًا من عنوان المحاضرة.</div>`}`;
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function startCards(mode, lessonId) {
    let pool = allCards.slice();
    if (mode === 'review') pool = pool.filter((card) => !state.masteredCards.includes(card.id));
    if (mode === 'lesson' && lessonId) pool = pool.filter((card) => card.lessonId === lessonId);
    if (!pool.length) {
      cardSummary = { total: 0, mastered: state.masteredCards.length };
      cardSession = null;
      currentView = 'cards';
      render();
      return;
    }
    cardSummary = null;
    cardSession = { cards: shuffle(pool), index: 0, revealed: false, mode, lessonId: lessonId || null };
    currentView = 'cards';
    activeLessonId = null;
    render();
  }

  function finishCard(markMastered) {
    const card = cardSession.cards[cardSession.index];
    if (markMastered && !state.masteredCards.includes(card.id)) {
      state.masteredCards.push(card.id);
      saveState();
    }
    cardSession.index += 1;
    cardSession.revealed = false;
    if (cardSession.index >= cardSession.cards.length) {
      cardSummary = { total: cardSession.cards.length, mastered: state.masteredCards.length };
      cardSession = null;
    }
    render();
  }

  function startQuiz(lessonId) {
    let pool = allQuestions.slice();
    if (lessonId && lessonId !== 'all') pool = pool.filter((question) => question.lessonId === lessonId);
    const questions = shuffle(pool).slice(0, Math.min(8, pool.length));
    quizSession = { questions, index: 0, score: 0, selected: null, answered: false, finished: false };
    currentView = 'quiz';
    activeLessonId = null;
    render();
  }

  function answerQuiz(index) {
    if (!quizSession || quizSession.answered) return;
    const question = quizSession.questions[quizSession.index];
    quizSession.selected = index;
    quizSession.answered = true;
    if (index === question.correct) quizSession.score += 1;
    render();
  }

  function nextQuizQuestion() {
    if (!quizSession) return;
    if (quizSession.index + 1 >= quizSession.questions.length) {
      quizSession.finished = true;
      state.quizAttempts += 1;
      if (state.bestScore == null || quizSession.score > state.bestScore) state.bestScore = quizSession.score;
      saveState();
    } else {
      quizSession.index += 1;
      quizSession.selected = null;
      quizSession.answered = false;
    }
    render();
  }

  function handleAction(action, element) {
    if (action === 'continue') {
      const lesson = findLesson(state.lastLessonId) || DATA.lessons[0];
      currentView = 'lessons'; activeLessonId = lesson.id; state.lastLessonId = lesson.id; saveState(); render();
    } else if (action === 'back-lessons') {
      activeLessonId = null; currentView = 'lessons'; render();
    } else if (action === 'toggle-complete') {
      const id = element.dataset.lessonId;
      state.completedLessons = isDone(id) ? state.completedLessons.filter((item) => item !== id) : [...state.completedLessons, id];
      saveState(); render();
    } else if (action === 'reveal-card') {
      if (cardSession) { cardSession.revealed = true; render(); }
    } else if (action === 'leave-cards') {
      cardSession = null; cardSummary = null; render();
    } else if (action === 'clear-card-summary') {
      cardSummary = null; render();
    } else if (action === 'leave-quiz') {
      quizSession = null; render();
    } else if (action === 'start-quiz') {
      const select = document.getElementById('quiz-filter');
      startQuiz(select ? select.value : 'all');
    } else if (action === 'next-question') {
      nextQuizQuestion();
    } else if (action === 'restart-quiz') {
      quizSession = null; render();
    } else if (action === 'back-exams') {
      activeExamId = null; currentView = 'exams'; render();
    } else if (action === 'reset-progress') {
      if (window.confirm('هل تريد مسح تقدّم المحاضرات والبطاقات ونتيجة الاختبارات من هذا المتصفح؟')) {
        state = defaultState(); cardSession = null; cardSummary = null; quizSession = null; saveState(); currentView = 'home'; render();
      }
    }
  }

  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      event.preventDefault();
      quizSession = null;
      setView(viewButton.dataset.view);
      return;
    }
    const openLesson = event.target.closest('[data-open-lesson]');
    if (openLesson) {
      activeLessonId = openLesson.dataset.openLesson;
      currentView = 'lessons';
      const lesson = findLesson(activeLessonId);
      if (lesson) { state.lastLessonId = lesson.id; saveState(); }
      render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return;
    }
    const openExam = event.target.closest('[data-open-exam]');
    if (openExam) { activeExamId = openExam.dataset.openExam; currentView = 'exams'; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const startCardButton = event.target.closest('[data-start-cards]');
    if (startCardButton) { quizSession = null; startCards(startCardButton.dataset.startCards, startCardButton.dataset.lessonId || null); return; }
    const startQuizButton = event.target.closest('[data-start-quiz]');
    if (startQuizButton) { startQuiz(startQuizButton.dataset.startQuiz); return; }
    const answerButton = event.target.closest('[data-answer-index]');
    if (answerButton) { answerQuiz(Number(answerButton.dataset.answerIndex)); return; }
    const nextCardButton = event.target.closest('[data-card-next]');
    if (nextCardButton) { finishCard(nextCardButton.dataset.cardNext === 'yes'); return; }
    const actionButton = event.target.closest('[data-action]');
    if (actionButton) { handleAction(actionButton.dataset.action, actionButton); }
  });

  document.getElementById('search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    quizSession = null;
    currentView = 'search'; activeLessonId = null; activeExamId = null;
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  render();
})();
