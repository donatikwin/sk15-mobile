<div align="center">
  <img src="./assets/images/logo-black.png" alt="SK-15 Logo" width="120" />
  
  # SK-15 — Новости Петропавловска
  
  Мобильное приложение для чтения новостей города Петропавловск  
  и Северо-Казахстанской области (СКО)
  
  ![React Native](https://img.shields.io/badge/React_Native-0.81-blue?style=flat-square&logo=react)
  ![Expo](https://img.shields.io/badge/Expo-SDK_54-black?style=flat-square&logo=expo)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
  ![Platform](https://img.shields.io/badge/Platform-Android-green?style=flat-square&logo=android)

</div>

---

## 📱 О проекте

**SK-15** — это новостное мобильное приложение для жителей Петропавловска и СКО. Название отсылает к коду региона — Северо-Казахстанская область (SKO-15).

Приложение агрегирует новости из местных СМИ, позволяет читать статьи, оставлять комментарии и получать push-уведомления о важных событиях.

**Бэкенд и административная панель:** [petropavlovsk-news.vercel.app](https://petropavlovsk-news.vercel.app)

---

## ✨ Возможности

| Функция | Описание |
|---------|----------|
| 📰 Лента новостей | Категории, поиск, фильтрация, Hero-карточка |
| 🔖 Избранное | Сохранение статей локально |
| ❤️ Лайки | Синхронизация с сервером |
| 💬 Комментарии | Добавление, удаление своих |
| 🔔 Push-уведомления | Через Expo Push API |
| 👤 Профиль | Редактирование, загрузка аватара |
| 🌐 Парсер новостей | Автосбор с pkzsk.info |
| ⚡ Кеширование | AsyncStorage, TTL 5 минут |
| 🦴 Skeleton-загрузка | Плейсхолдеры вместо спиннера |
| 🔠 Размер шрифта | Для слабовидящих (Аа кнопка) |

---

## 🛠 Технологический стек
React Native 0.81    — кроссплатформенная разработка
Expo SDK 54          — инструменты и компоненты
Expo Router 6        — файловая маршрутизация
TypeScript 5.9       — статическая типизация
Axios                — HTTP запросы
AsyncStorage         — локальное хранилище
Expo Notifications   — push-уведомления
Expo Image Picker    — загрузка аватара
Lucide RN            — иконки

---

## 🗂 Структура проекта
app/
_layout.tsx          — Корневой layout (AuthProvider)
index.tsx            — Splash-экран с анимацией
(auth)/
login.tsx          — Экран входа
register.tsx       — Регистрация
(app)/
index.tsx          — Главная (лента новостей)
bookmarks.tsx      — Избранное
profile.tsx        — Профиль пользователя
article/
[id].tsx           — Детальная страница статьи
context/
AuthContext.tsx      — Глобальный контекст авторизации
constants/
api.ts               — Базовый URL API
colors.ts            — Цветовая палитра

---

## 🚀 Запуск проекта

### Требования
- Node.js 18+
- npm / yarn
- Expo Go на телефоне (Android)

### Установка

```bash
# Клонировать репозиторий
git clone https://github.com/ВАШ_ЮЗЕРНЕЙМ/sk15-mobile.git
cd sk15-mobile

# Установить зависимости
npm install --legacy-peer-deps

# Запустить
npx expo start
```

Отсканируй QR-код в приложении **Expo Go** на телефоне.

---

## 📦 Сборка APK

```bash
# Установить EAS CLI
npm install -g eas-cli

# Авторизация
eas login

# Сборка APK
eas build -p android --profile preview
```

---

## 🎨 Цветовая палитра

| Цвет | Hex | Назначение |
|------|-----|------------|
| Primary | `#0A5C9B` | Кнопки, акценты |
| Accent | `#E8A020` | Золотой акцент |
| Dark | `#0d1b2a` | Фон шапки |
| Background | `#F0F4F8` | Фон страниц |

---

## 🔗 Связанные репозитории

- **Административная панель:** [petropavlovsk-news.vercel.app/admin](https://petropavlovsk-news.vercel.app/admin)
- **API документация:** [petropavlovsk-news.vercel.app/api](https://petropavlovsk-news.vercel.app/api)

---

<div align="center">
  Разработано в Петропавловске, СКО 🇰🇿
  <br/>
  © 2026 Бессараб Данил
</div>
