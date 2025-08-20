# Angular Prototyper Schematics

🚀 **Angular Prototyper Schematics** is an AI-powered Angular schematic tool that allows you to instantly generate Angular components using natural language prompts.  
It integrates with **Gemini AI** to convert plain-text descriptions into ready-to-use Angular standalone components.

---

## ✨ Features
- Generate Angular components with a simple command.
- Uses **Tailwind CSS** for modern styling.
- Auto-creates `.ts`, `.html`, and `.scss` files.
- Works with **Angular schematics** and can be installed globally or used locally.
- AI-powered code generation using **Gemini**.

---

## 📦 Installation

### 1. Clone the repository
```bash
git clone https://github.com/tayyabroy786/angular-gemini-prototyper.git
cd angular-prototyper-schematics
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install globally (optional)
```bash
npm install -g .
```

---

## ⚡ Usage

### Generate a component
You can generate a component by running the schematic command:

```bash
ng generate prototyper:component "Your component description here"
```

Example:

```bash
ng generate prototyper:component "Create a login form with email and password fields styled with Tailwind CSS"
```

This will generate:
- `login-form.component.ts`
- `login-form.component.html`
- `login-form.component.scss`

---

## 🛠 Configuration

- Make sure you have Angular CLI installed globally:

```bash
npm install -g @angular/cli
```

- Ensure Tailwind CSS is configured in your Angular project if you want Tailwind styles to work correctly.

---

## 💡 Notes

- Components are **standalone** by default.
- Use natural language prompts for more accurate AI-generated components.
- You can modify the generated files as needed after creation.

---

## 🔗 Links

- [Angular Official Docs](https://angular.io/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Gemini AI](https://www.gemini.ai)





<!-- npx schematics .:prototyper --dry-run=false -->
<!-- npx schematics prototyper:prototyper --project="demo-app" -->