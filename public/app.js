let pollingTimer = null;


async function checkIn() {

  const input =
    document.getElementById("attendeeId");

  const attendeeId =
    input.value.trim().toUpperCase();


  if (!attendeeId) {

    showStatus(
      "Please enter an attendee ID.",
      "error"
    );

    return;
  }


  try {

    const response =
      await fetch("/api/check-in", {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          attendeeId
        })

      });


    const data =
      await response.json();


    if (data.status === "ALREADY_CHECKED_IN") {

      showStatus(
        "Already Checked In — no second badge will be printed.",
        "warning"
      );

      return;
    }


    if (data.status === "PRINT_PENDING") {

      showStatus(
        "Printing badge... Please wait.",
        "pending"
      );


      /*
       * Start checking for webhook confirmation.
       */

      startPolling(attendeeId);

      return;
    }


    showStatus(
      data.message || "Unable to check in.",
      "error"
    );


  } catch (error) {

    console.error(error);

    showStatus(
      "Connection error.",
      "error"
    );

  }

}


function quickCheckIn(id) {

  document.getElementById("attendeeId").value = id;

  checkIn();

}


function startPolling(attendeeId) {

  if (pollingTimer) {

    clearInterval(pollingTimer);

  }


  pollingTimer = setInterval(
    async () => {

      try {

        const response =
          await fetch(
            `/api/check-in/${attendeeId}`
          );


        const attendee =
          await response.json();


        if (
          attendee.status ===
          "CHECKED_IN"
        ) {

          clearInterval(pollingTimer);

          showStatus(
            "✓ Checked In — badge printed successfully.",
            "success"
          );

          loadAttendees();

        }


        if (
          attendee.status ===
          "PRINT_FAILED"
        ) {

          clearInterval(pollingTimer);

          showStatus(
            "Badge printing failed. Please try again.",
            "error"
          );

        }

      } catch (error) {

        console.error(error);

      }

    },

    1000
  );

}


function showStatus(message, type) {

  const element =
    document.getElementById("status");


  element.textContent = message;

  element.className = type;

}


async function loadAttendees() {

  const response =
    await fetch("/api/attendees");


  const attendees =
    await response.json();


  const container =
    document.getElementById("attendees");


  container.innerHTML = "";


  attendees.forEach(attendee => {

    const div =
      document.createElement("div");


    div.className = "attendee";


    div.innerHTML = `
      <strong>${attendee.id}</strong>
      -
      ${attendee.name}
      :
      <span>${attendee.status}</span>
    `;


    container.appendChild(div);

  });

}


loadAttendees();
