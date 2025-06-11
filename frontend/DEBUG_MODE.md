# 🚨 Debug Mode - Tillfällig Firebase Bypass

Denna app har för tillfället **debug-läge aktiverat** på grund av att Firebase-databasen är otillgänglig.

## Vad gör debug-läget?

Debug-läget bypass:ar alla autentiseringskontroller och låter dig komma åt appen utan att behöva logga in via Firebase.

### Ändringar som gjorts:

1. **Middleware**: Bypass:ar alla auth-kontroller
2. **Auth utilities**: Mockar inloggning med localStorage
3. **Login-sida**: Visar en debug-knapp för snabb inloggning

## Hur man använder debug-läget

1. Gå till `/login`
2. Klicka på **"🚨 Debug Inloggning (Bypass Firebase)"**
3. Du kommer automatiskt att loggas in som en mock-användare

## Hur man inaktiverar debug-läget (när Firebase är fixat)

### Steg 1: Inaktivera debug-flaggan

Ändra `DEBUG_BYPASS_AUTH` från `true` till `false` i dessa filer:

```typescript
// frontend/src/middleware.ts
const DEBUG_BYPASS_AUTH = false; // Ändra till false

// frontend/src/utils/auth.ts
const DEBUG_BYPASS_AUTH = false; // Ändra till false
```

### Steg 2: Ta bort debug-bannern (valfritt)

Du kan ta bort debug-bannern och debug-knappen från `frontend/src/app/login/page.tsx`

### Steg 3: Rensa localStorage (för användare)

När debug-läget inaktiveras, rensa localStorage:

```javascript
localStorage.removeItem("debug_session");
localStorage.removeItem("debug_user");
```

## Mock-användardata

Debug-läget skapar en mock-användare med följande data:

- **ID**: debug_user_123
- **Username**: debug_user (eller det som anges vid "inloggning")
- **Email**: debug@example.com

## Varningar ⚠️

- **Ta ALDRIG med debug-läget till produktion**
- **Kom ihåg att inaktivera det när Firebase är fixat**
- **Debug-läget är bara för lokal utveckling**

## Felsökning

Om debug-läget inte fungerar:

1. Kontrollera att `DEBUG_BYPASS_AUTH = true` i båda filerna
2. Kolla browser-konsolen för debug-meddelanden (🚨 DEBUG MODE: ...)
3. Kontrollera att localStorage innehåller debug-session

```javascript
// Kontrollera i browser console
console.log("Debug session:", localStorage.getItem("debug_session"));
console.log("Debug user:", localStorage.getItem("debug_user"));
```
