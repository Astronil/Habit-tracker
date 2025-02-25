import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { getDatabase, ref, update, get } from "firebase/database";

// import {
//   getAuth,
//   GoogleAuthProvider,
//   signInWithPopup,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   updateProfile,
// } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// import {
//   getDatabase,
//   ref,
//   update,
//   get,
// } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
// // import {
//   getFirestore,
//   doc,
//   setDoc,
//   getDoc,
// } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { BiometricAuth } from "./biometric-auth.js"; // Correct import for the class

const auth = getAuth(); // Initialize Firebase Auth instance
const database = getDatabase(); // Initialize Firebase Realtime Database
// const firestore = getFirestore(); // Initialize Firestore

// Ensure the BiometricAuth class is available
const biometricAuth = new BiometricAuth();

// Function to show loading overlay
function showLoading() {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "block"; // Show the loading overlay
}

// Function to hide loading overlay
function hideLoading() {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "none"; // Hide the loading overlay
}

// Function to show toast messages
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.backgroundColor = isError ? "var(--error)" : "var(--success)";
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize biometricAuth and await its initialization
  await biometricAuth.init(); // Await the initialization to make sure it's ready

  console.log("Document loaded, initializing Firebase...");

  const googleBtn = document.getElementById("googleBtn");
  const registerForm = document.getElementById("registerForm");
  const registerBtn = document.getElementById("registerBtn");
  const loginForm = document.getElementById("loginForm");
  const biometricBtn = document.getElementById("biometricBtn");
  const registerModal = document.getElementById("registerModal");
  const closeModalBtns = document.querySelectorAll(".closeModalBtn");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (!sessionStorage.getItem("loggedIn")) {
        if (!window.location.pathname.includes("index.html")) {
          window.location.href = "login.html";
        }
      } else {
        if (window.location.pathname.includes("login.html")) {
          window.location.href = "index.html";
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      showToast(error.message, true);
    } finally {
      hideLoading();
    }
  });

  // Register form handler
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const name = document.getElementById("regName").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      showToast("Passwords do not match", true);
      hideLoading();
      return;
    }

    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Update user profile with name
      await updateProfile(userCredential.user, { displayName: name });

      // Create user document in Realtime Database
      await update(ref(database, `users/${userCredential.user.uid}`), {
        name,
        email,
        createdAt: Date.now(),
      });

      // Register biometric if available
      if (biometricAuth.available) {
        console.log("Starting biometric registration...");
        await biometricAuth.register(
          userCredential.user.uid,
          name,
          email,
          password
        ); // Pass email and password too
        console.log("Biometric registration complete");

        // Save the email and password to Realtime Database after successful biometric registration
        await update(
          ref(database, `biometricUsers/${userCredential.user.uid}`),
          {
            email,
            password, // Store the email and password for later biometric authentication
          }
        );
      } else {
        console.log("Biometric authentication not available on this device.");
      }

      showToast("Account created successfully!");

      // Delay redirection to ensure biometric data is saved
      setTimeout(() => {
        if (!sessionStorage.getItem("loggedIn")) {
          if (!window.location.pathname.includes("index.html")) {
            window.location.href = "login.html";
          }
        } else {
          if (window.location.pathname.includes("login.html")) {
            window.location.href = "index.html";
          }
        }
        // Redirect to home page
      }, 1000); // 1 second delay
    } catch (error) {
      console.error("Registration error:", error);
      showToast(error.message, true);
    } finally {
      hideLoading();
    }
  });

  // Handle Google sign-in
  googleBtn.addEventListener("click", async () => {
    console.log("Google sign-in button clicked.");
    showLoading(); // Show loading overlay
    const provider = new GoogleAuthProvider(); // Use the imported GoogleAuthProvider

    try {
      const result = await signInWithPopup(auth, provider); // Use signInWithPopup correctly
      console.log("Google sign-in successful:", result);

      // Create or update user document
      await update(ref(database, `users/${result.user.uid}`), {
        name: result.user.displayName,
        email: result.user.email,
        lastLogin: Date.now(),
      });

      if (!sessionStorage.getItem("loggedIn")) {
        if (!window.location.pathname.includes("index.html")) {
          window.location.href = "login.html";
        }
      } else {
        if (window.location.pathname.includes("login.html")) {
          window.location.href = "index.html";
        }
      }
      // Redirect to the dashboard
    } catch (error) {
      console.error("Google sign-in error:", error);
      showToast(`Google sign-in error: ${error.message}`, true);
    } finally {
      hideLoading(); // Hide loading overlay
    }
  });

  // Handle biometric authentication
  biometricBtn.addEventListener("click", async () => {
    console.log("Biometric authentication button clicked.");

    if (!biometricAuth.available) {
      showToast("Biometric authentication is not available", true);
      return;
    }

    showLoading();
    try {
      // Ensure the user is authenticated first
      const lastUser =
        auth.currentUser || JSON.parse(localStorage.getItem("lastUser"));

      if (!lastUser) {
        throw new Error(
          "Please sign in with email first to set up biometric authentication"
        );
      }

      const isAuthenticated = await biometricAuth.authenticate(lastUser.uid);
      console.log("Biometric authentication result:", isAuthenticated);

      if (isAuthenticated) {
        // Retrieve stored email and password for the current user from Realtime Database
        const snapshot = await get(
          ref(database, `biometricUsers/${lastUser.uid}`)
        );

        if (snapshot.exists()) {
          const { email, password } = snapshot.val();

          // Sign in the user with the stored email and password
          await signInWithEmailAndPassword(auth, email, password);
          console.log("User signed in with stored credentials");

          if (!sessionStorage.getItem("loggedIn")) {
            if (!window.location.pathname.includes("index.html")) {
              window.location.href = "login.html";
            }
          } else {
            if (window.location.pathname.includes("login.html")) {
              window.location.href = "index.html";
            }
          }
          // Redirect to the dashboard if biometric authentication is successful
        } else {
          throw new Error("Biometric user not found.");
        }
      } else {
        showToast("Biometric authentication failed", true);
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      showToast(`Biometric authentication error: ${error.message}`, true);
    } finally {
      hideLoading();
    }
  });

  // Modal controls
  registerBtn.addEventListener("click", () => {
    registerModal.style.display = "block";
  });

  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      registerModal.style.display = "none";
    });
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === registerModal) {
      registerModal.style.display = "none";
    }
  });

  // Password visibility toggle
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      const icon = button.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.textContent = "visibility";
      } else {
        input.type = "password";
        icon.textContent = "visibility_off";
      }
    });
  });

  // Password validation
  const regPassword = document.getElementById("regPassword");
  const requirements = document.querySelectorAll("[data-requirement]");

  regPassword.addEventListener("input", () => {
    const password = regPassword.value;

    // Check each requirement
    requirements.forEach((req) => {
      const type = req.dataset.requirement;
      let valid = false;

      switch (type) {
        case "length":
          valid = password.length >= 8;
          break;
        case "uppercase":
          valid = /[A-Z]/.test(password);
          break;
        case "lowercase":
          valid = /[a-z]/.test(password);
          break;
        case "number":
          valid = /\d/.test(password);
          break;
      }

      req.style.color = valid ? "var(--success)" : "var(--error)";
    });
  });

  // onAuthStateChanged(auth, (user) => {
  //   const isLoginPage = window.location.pathname.includes("login.html");

  //   if (user) {
  //     if (isLoginPage) {
  //       if (!sessionStorage.getItem("loggedIn")) {
  //         if (!window.location.pathname.includes("index.html")) {
  //           window.location.href = "login.html";
  //         }
  //       } else {
  //         if (window.location.pathname.includes("login.html")) {
  //           window.location.href = "index.html";
  //         }
  //       }
  //     }
  //   } else {
  //     if (!isLoginPage) {
  //       if (isLoginPage) {
  //         if (!sessionStorage.getItem("loggedIn")) {
  //           if (!window.location.pathname.includes("index.html")) {
  //             window.location.href = "login.html";
  //           }
  //         } else {
  //           if (window.location.pathname.includes("login.html")) {
  //             window.location.href = "index.html";
  //           }
  //         }
  //       }
  //     }
  //   }
  // });
});
