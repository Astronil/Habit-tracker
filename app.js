// import {
//   collection,
//   getDocs,
//   query,
//   where,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   doc,
// } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { auth } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
// import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/+esm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  // Firebase instances
  // Assuming firebase is available globally from CDN or similar
  // If not, you'll need to import it using a module bundler like webpack or parcel
  // For example:
  // import firebase from 'firebase/app';
  // import 'firebase/auth';
  // import 'firebase/database';
  // const auth = window.firebase.auth;
  // const database = window.firebase.database;
  // const firestore = window.firebase.firestore;
  // // Firebase Auth from module SDK
  const firestore = getFirestore(); // Firebase Firestore from module SDK

  const habitsList = document.getElementById("habitsList");
  if (!habitsList) {
    console.error("Element with ID 'habitsList' not found.");
    return; // Exit if the element is not found
  }
  habitsList.innerHTML = "";
  const addHabitBtn = document.getElementById("addHabitBtn");
  const habitModal = document.getElementById("habitModal");
  const habitForm = document.getElementById("habitForm");
  const closeHabitModal = document.querySelector("#habitModal .close-btn");
  const chatbotBtn = document.getElementById("chatbotBtn");
  const chatModal = document.getElementById("chatModal");
  const closeChatModal = document.querySelector("#chatModal .close-btn");
  const chatForm = document.getElementById("chatForm");
  const chatMessages = document.getElementById("chatMessages");
  const searchInput = document.getElementById("searchHabits");
  const logoutBtn = document.getElementById("logoutBtn");
  const themeToggle = document.getElementById("themeToggle");
  const toast = document.getElementById("toast");

  let currentUser = null;
  let editingHabitId = null;
  let habits = {};
  let selectedFilters = new Set();

  // Check authentication
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log("User authenticated:", user);
      currentUser = user;
      loadHabits();
      setupNotifications();
    } else {
      console.log("User not authenticated, redirecting to login.");
      if (!sessionStorage.getItem("redirected")) {
        sessionStorage.setItem("redirected", "true");
        window.location.href = "login.html";
      }
    }
  });

  // Load habits from Firestore
  async function loadHabits() {
    const habitsRef = collection(firestore, "habits");
    const q = query(habitsRef, where("userId", "==", currentUser.uid));

    try {
      const querySnapshot = await getDocs(q);
      console.log("Query Snapshot:", querySnapshot); // Log the snapshot
      console.log("Number of habits found:", querySnapshot.size); // Log the number of documents found
      habits = {};
      querySnapshot.forEach((doc) => {
        habits[doc.id] = doc.data();
      });
      console.log("Habits loaded:", habits);
      console.log("Loaded habits:", habits); // Log the habits after loading
      filterAndRenderHabits();
      updateStats();
    } catch (error) {
      console.error("Error loading habits:", error);
      showToast("Error loading habits", true);
    }
  }

  // Update statistics
  function updateStats() {
    const stats = Object.values(habits).reduce(
      (acc, habit) => {
        acc.total++;
        if (habit.lastCompleted === new Date().toDateString()) {
          acc.completed++;
        }
        acc.longestStreak = Math.max(acc.longestStreak, habit.streak || 0);
        return acc;
      },
      { total: 0, completed: 0, longestStreak: 0 }
    );

    document.getElementById("totalHabits").textContent = stats.total;
    document.getElementById("completedToday").textContent = stats.completed;
    document.getElementById(
      "longestStreak"
    ).textContent = `${stats.longestStreak} days`;
  }

  // Select the "All" button and other filter buttons
  const filterButtons = document.querySelectorAll(".filter-btn");
  const allButton = document.querySelector(".filter-btn[data-frequency='all']");

  // Set "All" as the default filter
  function setDefaultFilter() {
    selectedFilters.add("all");
    allButton.classList.add("selected");
  }

  // Run this on page load
  setDefaultFilter();

  // Add event listeners to filter buttons
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => toggleFilter(button));
  });

  function toggleFilter(button) {
    const frequency = button.dataset.frequency;

    if (frequency === "all") {
      // If "All" is clicked, reset filters
      selectedFilters.clear();
      selectedFilters.add("all");
      filterButtons.forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
    } else {
      // If a specific filter is clicked, toggle selection
      if (selectedFilters.has(frequency)) {
        selectedFilters.delete(frequency);
        button.classList.remove("selected");
      } else {
        selectedFilters.add(frequency);
        button.classList.add("selected");
      }

      // Remove "All" if other filters are selected
      if (selectedFilters.size > 0) {
        selectedFilters.delete("all");
        allButton.classList.remove("selected");
      }

      // If no filters are selected, default back to "All"
      if (selectedFilters.size === 0) {
        setDefaultFilter();
      }
    }

    // Re-render the habits
    filterAndRenderHabits();
  }

  function filterAndRenderHabits() {
    habitsList.innerHTML = ""; // Clear the list

    // If "All" is selected OR no filters are selected, show all habits
    if (selectedFilters.has("all") || selectedFilters.size === 0) {
      Object.entries(habits).forEach(([id, habit]) => renderHabit(id, habit));
    } else {
      // Otherwise, filter based on selected options
      Object.entries(habits).forEach(([id, habit]) => {
        if (selectedFilters.has(habit.frequency)) {
          renderHabit(id, habit);
        }
      });
    }

    // If no habits match, show message
    if (Object.keys(habits).length === 0) {
      habitsList.innerText = "No habits found.";
    }
  }

  // Render single habit
  function renderHabit(id, habit) {
    const div = document.createElement("div");
    div.className = "habit-card"; // Ensure you have CSS for this class
    div.innerHTML = `
        <div class="habit-header">
            <h3>${habit.name}</h3>
            <span class="streak-badge">
                <i class="material-icons">local_fire_department</i>
                ${habit.streak || 0} days
            </span>
        </div>
        <p>${habit.description || ""}</p>
        ${
          habit.reminder
            ? `
            <p class="reminder-text">
                <i class="material-icons">alarm</i>
                Reminder at ${habit.reminder}
            </p>
        `
            : ""
        }
        <div class="habit-actions">
            <button class="btn ${
              habit.lastCompleted === new Date().toDateString()
                ? "secondary-btn"
                : "primary-btn"
            } complete-btn" 
                data-id="${id}" aria-label="${
      habit.lastCompleted === new Date().toDateString()
        ? "Unmark completion"
        : "Mark as complete"
    }">
                <i class="material-icons">${
                  habit.lastCompleted === new Date().toDateString()
                    ? "check_circle"
                    : "radio_button_unchecked"
                }</i>
                ${
                  habit.lastCompleted === new Date().toDateString()
                    ? "Completed"
                    : "Mark Complete"
                }
            </button>
            <button class="btn icon-btn edit-btn" data-id="${id}" aria-label="Edit habit">
                <i class="material-icons">edit</i>
            </button>
            <button class="btn icon-btn delete-btn" data-id="${id}" aria-label="Delete habit">
                <i class="material-icons">delete</i>
            </button>
        </div>
    `;

    habitsList.appendChild(div); // Append the habit card to the list

    // Add event listeners
    div
      .querySelector(".complete-btn")
      .addEventListener("click", () => toggleComplete(id, habit));
    div
      .querySelector(".edit-btn")
      .addEventListener("click", () => editHabit(id, habit));
    div
      .querySelector(".delete-btn")
      .addEventListener("click", () => deleteHabit(id));
  }

  // Toggle habit completion
  async function toggleComplete(id, habit) {
    const today = new Date().toDateString();
    const wasCompletedToday = habit.lastCompleted === today;

    try {
      let streak = habit.streak || 0;
      const lastCompletedDate = habit.lastCompleted
        ? new Date(habit.lastCompleted)
        : null;

      if (!wasCompletedToday) {
        // Check if we're maintaining the streak
        if (lastCompletedDate) {
          const daysSinceLastCompleted = Math.floor(
            (new Date() - lastCompletedDate) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastCompleted > 1) {
            streak = 1; // Reset streak
          } else {
            streak++; // Increment streak
          }
        } else {
          streak = 1; // First completion
        }
      } else {
        streak = Math.max(0, streak - 1); // Decrement streak
      }

      const habitRef = doc(firestore, "habits", id); // Reference to the habit document
      await updateDoc(habitRef, {
        lastCompleted: wasCompletedToday ? null : today,
        streak: streak,
        lastUpdated: Date.now(),
      });

      showToast(wasCompletedToday ? "Habit unmarked" : "Habit completed!");

      // Re-render habits to reflect updated state
      loadHabits(); // Reload habits to ensure UI reflects the changes
    } catch (error) {
      console.error("Error updating habit:", error);
      showToast("Error updating habit", true);
    }
  }
  // Edit habit
  function editHabit(id, habit) {
    editingHabitId = id;
    document.getElementById("habitName").value = habit.name;
    document.getElementById("habitDescription").value = habit.description || "";
    document.getElementById("habitFrequency").value = habit.frequency;
    document.getElementById("habitReminder").value = habit.reminder || "";
    document.getElementById("habitModalTitle").textContent = "Edit Habit";
    habitModal.style.display = "block";
  }

  // Delete habit
  async function deleteHabit(id) {
    if (confirm("Are you sure you want to delete this habit?")) {
      try {
        const habitRef = doc(firestore, "habits", id); // Reference to the habit document
        await deleteDoc(habitRef); // Delete the habit from Firestore
        showToast("Habit deleted");
        loadHabits(); // Reload habits to reflect the deletion
      } catch (error) {
        console.error("Error deleting habit:", error);
        showToast("Error deleting habit", true);
      }
    }
  }

  // Handle habit form submission
  habitForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const habitData = {
      name: document.getElementById("habitName").value,
      description: document.getElementById("habitDescription").value,
      frequency: document.getElementById("habitFrequency").value,
      reminder: document.getElementById("habitReminder").value,
      userId: currentUser.uid,
      createdAt: Date.now(),
      streak: 0,
    };

    try {
      if (editingHabitId) {
        // Update existing habit
        const habitRef = doc(firestore, "habits", editingHabitId); // Reference to the habit document
        habitData.updatedAt = Date.now(); // Add this line

        if (editingHabitId) {
          // Update existing habit
          const habitRef = doc(firestore, "habits", editingHabitId); // Reference to the habit document
          await updateDoc(habitRef, {
            name: habitData.name,
            description: habitData.description,
            frequency: habitData.frequency,
            reminder: habitData.reminder,
            updatedAt: habitData.updatedAt, // Now it's a valid timestamp
          });
          showToast("Habit updated");
        } else {
          // Create new habit
          await addDoc(collection(firestore, "habits"), habitData); // Add new habit to Firestore
          showToast("Habit created");
        }

        showToast("Habit updated");
      } else {
        // Create new habit
        await addDoc(collection(firestore, "habits"), habitData); // Add new habit to Firestore
        showToast("Habit created");
      }

      habitModal.style.display = "none";
      habitForm.reset();
      editingHabitId = null;

      // Schedule reminder if set
      if (habitData.reminder) {
        scheduleReminder(habitData);
      }

      loadHabits(); // Reload habits to reflect the new addition or update
    } catch (error) {
      console.error("Error saving habit:", error.message); // Log the error message
      showToast("Error saving habit", true);
    }
  });

  // Handle chat form submission
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    if (!message) return;

    // Add user message to chat
    addMessageToChat("user", message);
    messageInput.value = "";

    try {
      // Call Gemini API using the CDN method
      const response = await callGeminiAI(message);
      addMessageToChat("bot", response);
    } catch (error) {
      console.error("Chat error:", error);
      addMessageToChat(
        "bot",
        "Sorry, I encountered an error. Please try again."
      );
    }
  });

  // Call Gemini API using GoogleGenerativeAI CDN
  async function callGeminiAI(message) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    return result.response.text();
  }

  // Add message to chat
  function addMessageToChat(type, message) {
    const div = document.createElement("div");
    div.className = `message ${type}-message`;
    div.textContent = message;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Setup notifications
  async function setupNotifications() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // Schedule reminders for existing habits
      Object.values(habits).forEach((habit) => {
        if (habit.reminder) {
          scheduleReminder(habit);
        }
      });
    } catch (error) {
      console.error("Notification setup error:", error);
    }
  }

  // Schedule reminder
  function scheduleReminder(habit) {
    if (!habit.reminder) return;

    const [hours, minutes] = habit.reminder.split(":");
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0);

    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const timeUntilReminder = reminderTime - now;
    setTimeout(() => {
      new Notification("Habit Reminder", {
        body: `Time to complete your habit: ${habit.name}`,
        icon: "/icon.png",
      });
      scheduleReminder(habit); // Schedule next day's reminder
    }, timeUntilReminder);
  }

  // Show toast message
  function showToast(message, isError = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isError ? "var(--error)" : "var(--success)";
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }

  const root = document.documentElement; // Target the root element

  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem("theme");

  // Apply the saved theme or system preference
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    root.setAttribute("data-theme", "dark");
    themeToggle.querySelector("i").textContent = "light_mode"; // Set icon to light mode
  } else {
    root.setAttribute("data-theme", "light");
    themeToggle.querySelector("i").textContent = "dark_mode"; // Set icon to dark mode
  }

  // Theme toggle event
  themeToggle.addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark";

    // Toggle theme
    root.setAttribute("data-theme", isDark ? "light" : "dark");

    // Save theme preference in localStorage
    localStorage.setItem("theme", isDark ? "light" : "dark");

    // Change the icon
    themeToggle.querySelector("i").textContent = isDark
      ? "dark_mode"
      : "light_mode";
  });

  // Modal controls
  addHabitBtn.addEventListener("click", () => {
    editingHabitId = null;
    habitForm.reset();
    document.getElementById("habitModalTitle").textContent = "Add New Habit";
    habitModal.style.display = "block";
  });

  closeHabitModal.addEventListener("click", () => {
    habitModal.style.display = "none";
  });

  chatbotBtn.addEventListener("click", () => {
    chatModal.style.display = "block";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  closeChatModal.addEventListener("click", () => {
    chatModal.style.display = "none";
  });

  // Handle logout
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      if (!sessionStorage.getItem("redirected")) {
        sessionStorage.setItem("redirected", "true");
        window.location.href = "login.html";
      }
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Error logging out", true);
    }
  });

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === habitModal) {
      habitModal.style.display = "none";
    }
    if (e.target === chatModal) {
      chatModal.style.display = "none";
    }
  });

  // Handle keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      habitModal.style.display = "none";
      chatModal.style.display = "none";
    }
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "n":
          e.preventDefault();
          addHabitBtn.click();
          break;
        case "/":
          e.preventDefault();
          searchInput.focus();
          break;
      }
    }
  });
});
