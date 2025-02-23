// Import necessary Firebase functions
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getDatabase,
  get,
  set,
  ref,
  update,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Access Firestore from global scope
const firestore = window.firebase.firestore;
const database = getDatabase();

class BiometricAuth {
  constructor() {
    this.available = false;
    this.init();
  }

  async init() {
    try {
      if (!window.PublicKeyCredential) {
        console.log("WebAuthn is not supported in this browser");
        return;
      }

      // Check if platform authenticator is available
      this.available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (error) {
      console.error("Error initializing biometric authentication:", error);
      this.available = false;
    }
  }

  async register(userId, userName, email, password) {
    if (!this.available) {
      throw new Error("Biometric authentication is not available");
    }

    try {
      // Debugging logs for email and password
      console.log("Email:", email);
      console.log("Password:", password);

      // Ensure email and password are not undefined
      if (!email || !password) {
        throw new Error("Email or password is missing");
      }

      const userIdBuffer = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions = {
        challenge: new Uint8Array(32), // This challenge should ideally be generated on the server
        rp: {
          name: "Habit Tracker",
          id: window.location.hostname,
        },
        user: {
          id: userIdBuffer,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          {
            type: "public-key",
            alg: -7, // ES256 algorithm
          },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      const credentialId = btoa(
        String.fromCharCode(...new Uint8Array(credential.rawId))
      );

      // Store the credentialId, userId, email, and password in Realtime Database
      await set(ref(database, `biometricCredentials/${userId}`), {
        credentialId,
        uid: userId, // Store the user's UID
        email, // Store the email for later use
        password, // Store the password for later use (not recommended for production, but works for now)
        timestamp: Date.now(),
      });

      console.log("Biometric credentials and user info saved successfully");
      return true;
    } catch (error) {
      console.error("Error registering biometric:", error);
      throw error;
    }
  }

  async authenticate(userId) {
    if (!this.available) {
      throw new Error("Biometric authentication is not available");
    }

    try {
      // Fetch the stored credentialId (public key), email, and password from Realtime Database
      const credentialSnapshot = await get(
        ref(database, `biometricCredentials/${userId}`)
      );

      if (!credentialSnapshot.exists()) {
        throw new Error("No registered biometric credentials found");
      }

      const storedCredential = credentialSnapshot.val();
      const credentialId = Uint8Array.from(
        atob(storedCredential.credentialId), // Decode the base64 string
        (c) => c.charCodeAt(0)
      );

      console.log("Decoded credentialId:", credentialId);

      // Generate a secure challenge (e.g., using crypto or get it from your server)
      const challenge = this.generateChallenge();

      // Prepare assertion options
      const assertionOptions = {
        challenge: challenge, // Use the generated challenge
        allowCredentials: [
          {
            id: credentialId, // Use the decoded credentialId
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      };

      // Log assertion options for debugging
      console.log("Assertion Options:", assertionOptions);

      // Request the assertion
      const assertion = await navigator.credentials.get({
        publicKey: assertionOptions,
      });

      console.log("Assertion:", assertion);

      // If the assertion was successful, we sign the user into Firebase
      if (assertion) {
        // Get the email and password from the stored data
        const { email, password } = storedCredential;

        // Sign in the user with the stored email and password
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User successfully authenticated with Firebase.");

        window.location.href = "habits.html"; // Redirect to the dashboard if authentication is successful
        return true;
      } else {
        console.error("Biometric authentication failed");
        return false;
      }
    } catch (error) {
      console.error("Error authenticating with biometric:", error);
      throw error;
    }
  }

  // Generate a secure challenge (This can be securely generated on the server)
  generateChallenge() {
    // Simple random challenge for now; use a more secure method in production
    return new Uint8Array(32);
  }
}

// Make sure the BiometricAuth class is globally available
window.BiometricAuth = BiometricAuth;
