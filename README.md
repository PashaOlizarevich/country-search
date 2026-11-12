# Country Search

Учебное приложение по [заданию RS School](https://github.com/rolling-scopes-school/tasks/blob/master/fullstack-engineering/tasks/country-search/README.md).

Локальная копия полного ТЗ: [docs/TASK.md](docs/TASK.md). Условия лицензии исходного задания сохранены в [docs/TASK_LICENSE.txt](docs/TASK_LICENSE.txt).

Сейчас создана только структура проекта. Интерфейс, запросы и тесты ещё не реализованы. Существующие соседние проекты не используются как зависимости.

## Структура

```text
country-search/
  .agents/
    rules/
    skills/
  docs/
    ARCHITECTURE.md
    DESIGN_PROJECT.md
    IMPLEMENTATION_PLAN.md
    STACK.md
    TASK.md
    TASK_LICENSE.txt
    progress.md
  src/
    api/
    models/
    search/
    ui/
    utils/
    styles/
      index.css
    main.ts
  tests/
    fixtures/
  .editorconfig
  .gitignore
  AGENTS.md
  DESIGN.md
  index.html
  package.json
  tsconfig.json
```

Подробности и границы модулей: [архитектура](docs/ARCHITECTURE.md). В папках исходников есть README с запланированными файлами.

Визуальная концепция, экраны, 3D-флаг, адаптивность и критерии проверки описаны в [дизайн-проекте](docs/DESIGN_PROJECT.md).

Порядок работы: [план реализации](docs/IMPLEMENTATION_PLAN.md), разделённый на визуальную и логическую части с отметками применения WB app.

## Правила и навыки AI-помощника

[AGENTS.md](AGENTS.md) задаёт порядок чтения правил и выбор навыка по задаче. В `.agents/rules/` хранятся общие и тематические требования; в `.agents/skills/` — сценарии настройки инструментов, поисковой логики и UI. Текущее состояние фиксируется в [прогрессе](docs/progress.md).

Для подготовки к кросс-чеку предусмотрен отдельный маршрут [финальной проверки и сдачи](.agents/rules/acceptance.md): сверка ТЗ, DESIGN.md, истории TDD, деплоя и материалов PR.

Открывай `country-search` как рабочую папку Codex для обнаружения проектных инструкций и навыков. При запуске из родительской `rsschool` можно явно попросить прочитать `country-search/AGENTS.md` и нужный `SKILL.md`. Если новый навык не появился в клиенте, перезапусти сессию в папке проекта. Markdown-правила читаются по ссылкам из AGENTS.md; настройки разрешений запуска команд не менялись.

Формат и обнаружение сверены с официальной документацией OpenAI: [навыки](https://learn.chatgpt.com/docs/build-skills), [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Проектные правила не являются файлами [политики запуска команд](https://learn.chatgpt.com/docs/agent-configuration/rules).

## Стек

TypeScript и DOM API, обычный CSS, `fetch` и `AbortController`, компиляция через `tsc` в ES-модули. Выбран Vitest; для проверки кода и Git-хуков предусмотрены ESLint, Prettier, Husky и lint-staged. Пакетный менеджер — npm.

Обязательные требования ТЗ, наши решения и текущий статус настройки каждого инструмента: [стек проекта](docs/STACK.md).

## Настройка и запуск

Локальный Git подключён к созданному приватному репозиторию. Начальный коммит `594e4fa` опубликован в `main` и содержит только `.gitignore`. Проверенный каркас и документация сохранены отдельным коммитом в локальной ветке `country-search`; рабочая ветка пока не отправлена на GitHub.

На момент создания каркаса обнаружены Node.js 24.14.1 и npm 11.11.0. Зависимости не устанавливались; `node_modules` и lock-файла пока нет.

`package.json` объявляет TypeScript 6.0.3, совместимый с выбранным typescript-eslint. Проверенный набор версий будущих инструментов записан в [стеке](docs/STACK.md). После согласованной установки зависимостей будут доступны:

```powershell
npm run typecheck
npm run build
```

Обе команды запущены, но завершились ошибкой: локальный TypeScript отсутствует, команда `tsc` не найдена. После компиляции `index.html` нужно открывать через локальный HTTP-сервер из корня проекта. Выбран http-server; пока не установлен и не настроен. На текущем этапе страница будет пустой: `main.ts` содержит только заготовку точки входа.

Vitest, ESLint, Prettier, Husky и lint-staged ещё предстоит настроить. Скрипты `test`, `lint`, `format` добавим вместе с их зависимостями, чтобы команды соответствовали рабочим конфигурациям.

## Следующий этап

Завершить настройку инструментов и Git по требованиям задания, затем начать визуальную часть. Обязательную поисковую логику писать после тестов. Документ [DESIGN.md](DESIGN.md) пока содержит вопросы для будущего заполнения, а не описание готовой реализации.
