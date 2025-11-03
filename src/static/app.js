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

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name;
        activityCard.dataset.max = String(details.max_participants);
        activityCard.dataset.count = String(details.participants.length);

        let spotsLeft = details.max_participants - details.participants.length;

        const titleEl = document.createElement("h4");
        titleEl.textContent = name;
        const descEl = document.createElement("p");
        descEl.textContent = details.description;
        const scheduleEl = document.createElement("p");
        scheduleEl.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;
        const availabilityEl = document.createElement("p");
        availabilityEl.className = "availability";
        availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";
        participantsSection.innerHTML = '<p><strong>Current Participants:</strong></p>';

        const participantsListEl = document.createElement("ul");
        participantsListEl.className = "participants-list";

        if (details.participants && details.participants.length > 0) {
          details.participants.forEach(p => {
            const li = document.createElement("li");
            li.textContent = typeof p === "string" ? p : p.email || p.name || String(p);
            participantsListEl.appendChild(li);
          });
        } else {
          const emptyLi = document.createElement("li");
          emptyLi.className = "empty-note";
          emptyLi.textContent = "No participants yet - Be the first to join!";
          participantsListEl.appendChild(emptyLi);
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

        if (spotsLeft <= 0) {
          addForm.querySelector("input[name='participantEmail']").disabled = true;
          addForm.querySelector("button").disabled = true;
        }

        // Inline add-participant submit
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
              // Remove only the empty-note li if present
              const emptyNoteLi = participantsListEl.querySelector('.empty-note');
              if (emptyNoteLi) emptyNoteLi.remove();

              // Add new participant li
              const li = document.createElement("li");
              li.textContent = email;
              participantsListEl.appendChild(li);

              details.participants.push(email);
              spotsLeft = details.max_participants - details.participants.length;
              availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
              activityCard.dataset.count = String(details.participants.length);

              if (spotsLeft <= 0) {
                input.disabled = true;
                addForm.querySelector("button").disabled = true;
              }

              cardMessage.textContent = result.message || "Participant added";
              cardMessage.className = "message success";
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

        activityCard.appendChild(titleEl);
        activityCard.appendChild(descEl);
        activityCard.appendChild(scheduleEl);
        activityCard.appendChild(availabilityEl);
        activityCard.appendChild(participantsSection);
        activityCard.appendChild(addForm);
        activityCard.appendChild(cardMessage);

        activitiesList.appendChild(activityCard);

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

  // Global signup form
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";

        // Find and update the corresponding activity card
        const card = Array.from(activitiesList.children)
          .find(c => c.dataset && c.dataset.activity === activity);

        if (card) {
          const participantsList = card.querySelector('.participants-list');
          if (participantsList) {
            // Remove only the empty-note li if present
            const emptyNoteLi = participantsList.querySelector('.empty-note');
            if (emptyNoteLi) emptyNoteLi.remove();

            // Add new participant li
            const li = document.createElement('li');
            li.textContent = email;
            participantsList.appendChild(li);

            // Update counts
            const count = parseInt(card.dataset.count || '0', 10) + 1;
            card.dataset.count = String(count);
            const max = parseInt(card.dataset.max || '0', 10);
            const spotsLeft = Math.max(0, max - count);

            // Update availability display
            const availabilityEl = card.querySelector('.availability');
            if (availabilityEl) {
              availabilityEl.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
            }

            // Disable add form if full
            if (spotsLeft <= 0) {
              const addForm = card.querySelector('.add-participant-form');
              if (addForm) {
                addForm.querySelector('input').disabled = true;
                addForm.querySelector('button').disabled = true;
              }
            }
          }
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
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

  fetchActivities();
});
