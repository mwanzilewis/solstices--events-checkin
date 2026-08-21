const attendees = new Map();

attendees.set("A001", {
  id: "A001",
  name: "John Kamau",
  status: "NOT_CHECKED_IN",
  printRequestId: null
});

attendees.set("A002", {
  id: "A002",
  name: "Mary Wanjiku",
  status: "NOT_CHECKED_IN",
  printRequestId: null
});

attendees.set("A003", {
  id: "A003",
  name: "Brian Otieno",
  status: "NOT_CHECKED_IN",
  printRequestId: null
});

function getAttendee(id) {
  return attendees.get(id);
}

function updateAttendee(id, data) {
  const attendee = attendees.get(id);

  if (!attendee) {
    return null;
  }

  const updated = {
    ...attendee,
    ...data
  };

  attendees.set(id, updated);

  return updated;
}

function getAllAttendees() {
  return Array.from(attendees.values());
}

module.exports = {
  getAttendee,
  updateAttendee,
  getAllAttendees
};
