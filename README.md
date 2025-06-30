# Meat.exe
A minimal static WebGL shooter ready for Netlify deployment.

// === ЦЕЛЬ ==============================================================
// Сгенерируй полный фронтовый проект «MEAT.EXE» — горизонтальный (landscape)
// браузерный WebGL-шутер с безумной мясной эстетикой.
//
// ✔ Landscape-режим (mobile-first: 100 % vw × 100 % vh).
// ✔ Чистый статический сайт: index.html в корне, *.js / *.css рядом.
// ✔ 0 бинарников (ни PNG, ни шрифтов) — только код и текст.
// ✔ Должно деплоиться «как есть» на Netlify (index.html = publish root).
// =======================================================================



// ---------- ФАЙЛОВАЯ СТРУКТУРА ----------------------------------------
// ./index.html       — базовая разметка, meta viewport landscape-lock.
// ./styles.css       — визуальный стиль (virus-gore + неоновый CRT).
// ./main.js          — точка входа, gameloop, импорт остальных модулей.
// ./engine.js        — WebGL2 init, рендер сцены, камера, лайт.
// ./organGen.js      — процедурная генерация «орган-уровней».
// ./shaderGuns.js    — набор GLSL-строк + hot-reload редактор пушек.
// ./goreSim.js       — кровь: частицы, растекание, лимитер.
// ./metaMutate.js    — self-balancing + хаос-правила ран-to-ран.
// (никаких других файлов; noise/simplex можешь встроить прямо в organGen.js)


// ---------- ВИЗУАЛЬНЫЙ СТИЛЬ -------------------------------------------
// • Фон <canvas> на весь экран: #050505 + radial-gradient( #0a0015 → #050505 ).
// • Сущности рендери через ShaderMaterial (Three.js r167) или raw GL – на твой
//   выбор, но комментарии дай, чтобы читабельно.
// • Пули и сплаттеры — ядреные неоны (#ff0040, #00eaff, #faff00).
// • Кровь = мелкие точки, растекающиеся по grid-текстуре; при лимите
//   "исчезают" с дымком (alpha fade).
// • UI: glass-панели в углах (HP, ammo, meta-муты) с backdrop-filter: blur(6px),
//   цвет текста inherit, text-shadow: 0 0 6px currentColor.
// • Landscape-lock: body { width:100vw; height:100vh; overflow:hidden;
//   touch-action:none; transform: rotate(0deg); }  // no portrait shit


// ---------- CORE ГЕЙМПЛЕЙ ---------------------------------------------
// • Камера top-down ortho, но при стрельбе FOV дергается (шок).
// • Мир = «орган» — сшивка комнат-кишок (32 шаблона × simplex noise
//   от seed run-id). Генерация в organGen.generate(chunkX,chunkY).
// • Волна врагов каждые 7 с: spawnWave(difficultyScalar).
// • Shader Guns: массив модулей [{name, fragSrc, cooldown, energyCost, lvl}].
//   Две копии → lvl++ (урон + форма спрайта мутирует).
// • Hot-reload редактор: textarea (hidden on mobile unless dev=1) →
//   заменяет фраг-шейдер прямо во время ранде.
// • Self-balancing: каждую 1 мин счётчик playerDPS vs expDPS →
//   difficultyScalar = clamp(0.8 + (DPS/exp−1)*0.6 − (lowHP?0.1:0)
//                              + minutes*0.05, 0.7, 3.5).
// • Опередил баланс >40 % → шанс Glitch-Event: инверт цвета, анти-чит-мобы
//   (неуязвимые до спада твоего DPS). Победа = «битый шейдер» (унлимит фаер).
// • Meta-mutation: после гибели случайно меняем 1 правило движка
//   (гравитация, friction, enemySpeed, FOV, bloodLimit).


// ---------- ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ ------------------------------------
// • Чистый Vanilla JS ES Modules + минимальный Three.js (r167) или raw WebGL2.
// • Физика: AABB + circle коллизии для мобов/пуль, GPU instance-draw для толпы.
// • requestAnimationFrame гамелооп; resize адаптирует DPR.
// • Управление: pointer-lock на десктопе; на мобиле — два Canvas-стика
//   (левый — движение, правый — прицел, тап по правому — огонь).
// • Сборка НЕ нужна; пиши файл-на-файл, прямо подключённый в index.html
//   (<script type="module" src="main.js">).
// • Комменты RU/EN mix, матерись умеренно (1-2 Easter-egg строки ок).


// ---------- DEV-GOODIES -----------------------------------------------
// • Query ?dev=1 в URL включает:
//   – кнопку «Force Glitch» (top-left, z-index:999),
//   – textarea редактора GLSL для текущего оружия,
//   – FPS/DrawCalls overlay.


// ---------- ОТДАЧА -----------------------------------------------------
// Выведи ПО ПОРЯДКУ полный текст файлов, каждый оберни в заголовок:
//
// ***=== index.html ===***
// <код>
//
// ***=== styles.css ===***
// <код>
//
// ***=== main.js ===***
// <код>
// …и т.д.
//
// Никаких лишних файлов, картинок, внешних CDN; весь JS – в этих файлах.
// Проект после пуша → GitHub → «Import from GitHub» на Netlify
// должен сразу подняться без билд-шагов.
//
// Погнали!
// ```
