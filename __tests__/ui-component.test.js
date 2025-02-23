// __tests__/ui-component.test.js
import "@testing-library/jest-dom";

describe("UI Component: index.html", () => {
  beforeEach(() => {
    // Set up the initial HTML structure
    document.body.innerHTML = `
      <div class="auth-container">
        <main class="auth-card">
          <h1>Welcome to Habit Tracker</h1>
          <p class="auth-subtitle">Please sign in to continue</p>
          <div class="auth-methods">
            <button id="biometricBtn" class="btn primary-btn" aria-label="Sign in with biometric authentication">
              <i class="material-icons">fingerprint</i>
              Sign in with Biometric
            </button>
            <button id="googleBtn" class="btn secondary-btn" aria-label="Sign in with Google">
              <img src="https://www.google.com/favicon.ico" alt="" width="18" height="18" />
              Continue with Google
            </button>
          </div>
        </main>
      </div>
    `;
  });

  test("should have a biometric sign-in button with correct text", () => {
    const biometricBtn = document.getElementById("biometricBtn");
    expect(biometricBtn).toBeInTheDocument();
    expect(biometricBtn.textContent.includes("Sign in with Biometric")).toBe(
      true
    );
  });

  test("should have a Google sign-in button with correct text", () => {
    const googleBtn = document.getElementById("googleBtn");
    expect(googleBtn).toBeInTheDocument();
    expect(googleBtn.textContent.includes("Continue with Google")).toBe(true);
  });
});
