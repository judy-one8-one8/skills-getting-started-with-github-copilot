document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        // --- CHANGED: set data attributes to identify card and counts ---
        activityCard.dataset.activity = name;
        activityCard.dataset.max = String(details.max_participants);
        activityCard.dataset.count = String(details.participants.length);

        // Compute spots left
        let spotsLeft = details.max_participants - details.participants.length;

        // Title and description
        const titleEl = document.createElement("h4");
        titleEl.textContent = name;
        const descEl = document.createElement("p");
        descEl.textContent = details.description;
        const scheduleEl = document.createElement("p");
        scheduleEl.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        const availabilityEl = document.createElement("p");
        // --- CHANGED: give availability paragraph a class so it can be updated later ---
        availabilityEl.className = "availability";
        availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        // Participants section (always present)
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsTitle = document.createElement("p");
        participantsTitle.innerHTML = "<strong>Current Participants:</strong>";
        participantsSection.appendChild(participantsTitle);

        const participantsListEl = document.createElement("ul");
        participantsListEl.className = "participants-list";

        if (details.participants.length > 0) {
          details.participants.forEach((p) => {
            // CHANGED: normalize participant value (handle string or object)
            const emailText =
              typeof p === "string"
                ? p
                : (p && (p.email || p.address || p.name)) || JSON.stringify(p);

            const li = document.createElement("li");
            li.textContent = emailText;
            participantsListEl.appendChild(li);
          });
        } else {
          const emptyNote = document.createElement("p");
          emptyNote.className = "empty-note";
          emptyNote.style.fontStyle = "italic";
          emptyNote.textContent = "No participants yet - Be the first to join!";
          participantsSection.appendChild(emptyNote);
        }

        participantsSection.appendChild(participantsListEl);

        // Inline add-participant form
        const addForm = document.createElement("form");
        addForm.className = "add-participant-form";
        addForm.style.marginTop = "10px";
        addForm.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="email" name="participantEmail" placeholder="participant email" required
                   style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:14px;" />
            <button type="submit">Add</button>
          </div>
        `;

        const cardMessage = document.createElement("div");
        cardMessage.className = "message hidden";
        cardMessage.style.marginTop = "8px";

        // Disable form when no spots left
        if (spotsLeft <= 0) {
          addForm.querySelector("input[name='participantEmail']").disabled = true;
          addForm.querySelector("button").disabled = true;
        }

        // Handle inline add-participant submit
        addForm.addEventListener("submit", async (ev) => {
          ev.preventDefault();
          const input = addForm.querySelector("input[name='participantEmail']");
          const email = input.value.trim();
          if (!email) return;

          try {
            const res = await fetch(
              `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
              { method: "POST" }
            );
            const result = await res.json();

            if (res.ok) {
              // Remove empty-note if present
              const emptyNote = participantsSection.querySelector(".empty-note");
              if (emptyNote) emptyNote.remove();

              // Append new participant to list and update internal count
              const li = document.createElement("li");
              // CHANGED: normalize email in case server uses object structure
              const emailText = typeof email === "string" ? email : (email && (email.email || email.address || email.name)) || String(email);
              li.textContent = emailText;
              participantsListEl.appendChild(li);
              details.participants.push(email);
              spotsLeft = details.max_participants - details.participants.length;
              availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

              // Disable add form if full
              if (spotsLeft <= 0) {
                input.disabled = true;
                addForm.querySelector("button").disabled = true;
              }

              cardMessage.textContent = result.message || "Participant added";
              cardMessage.className = "message success";
              // clear input
              input.value = "";
            } else {
              cardMessage.textContent = result.detail || "Failed to add participant";
              cardMessage.className = "message error";
            }
          } catch (err) {
            console.error("Inline signup error:", err);
            cardMessage.textContent = "Failed to add participant. Try again.";
            cardMessage.className = "message error";
          } finally {
            cardMessage.classList.remove("hidden");
            setTimeout(() => cardMessage.classList.add("hidden"), 4000);
          }
        });

        // Assemble card
        activityCard.appendChild(titleEl);
        activityCard.appendChild(descEl);
        activityCard.appendChild(scheduleEl);
        activityCard.appendChild(availabilityEl);
        activityCard.appendChild(participantsSection);
        activityCard.appendChild(addForm);
        activityCard.appendChild(cardMessage);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // --- CHANGED: update the activity card in-place so participants show immediately ---
        // find the card with matching data-activity (avoid CSS selector pitfalls)
        const cards = Array.from(activitiesList.children);
        const card = cards.find((c) => c.dataset && c.dataset.activity === activity);
        if (card) {
          // remove empty-note if present
          const emptyNote = card.querySelector(".empty-note");
          if (emptyNote) emptyNote.remove();

          // append new participant to list
          const participantsListEl = card.querySelector(".participants-list");
          if (participantsListEl) {
            const li = document.createElement("li");
            const emailText = typeof email === "string" ? email : (email && (email.email || email.address || email.name)) || String(email);
            li.textContent = emailText;
            participantsListEl.appendChild(li);
          }

          // increment count and update availability
          const max = parseInt(card.dataset.max || "0", 10);
          const count = parseInt(card.dataset.count || "0", 10) + 1;
          card.dataset.count = String(count);
          const spotsLeft = Math.max(0, max - count);
          const availabilityEl = card.querySelector(".availability");
          if (availabilityEl) {
            availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
          }

          // disable inline add form if full
          if (spotsLeft <= 0) {
            const addFormInput = card.querySelector("input[name='participantEmail']");
            const addFormButton = card.querySelector(".add-participant-form button");
            if (addFormInput) addFormInput.disabled = true;
            if (addFormButton) addFormButton.disabled = true;
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
