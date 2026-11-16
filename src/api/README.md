# API

cachedSearch.ts — обёртка над searchCountries: TTL 5 минут, максимум 50 записей, общий transport одинаковых запросов и отдельные promises/сигналы потребителей. Последняя отмена прерывает transport; ошибки не кэшируются, ответы копируются каждому получателю.

searchCountries.ts принимает строку и внешний AbortSignal, возвращает Promise<Country[]>. Пустая строка не вызывает fetch; запрос обрезается и кодируется как сегмент пути. HTTP 404 возвращает пустой массив до разбора тела. Остальные неуспешные статусы бросают HttpError из errors.ts. Успешный JSON проверяется как unknown и преобразуется через mapCountryResponse.

errors.ts также содержит classifySearchError: aborted, timeout, empty, http или error. Сетевые ошибки и причины отмены при fetch/чтении тела сохраняются. В src/search/searchController.ts единый AbortController отменяется вводом либо таймером с причиной TimeoutError; ресурсами управляет контроллер. Модули не обращаются к DOM; тесты рядом используют mock fetch без сети.
