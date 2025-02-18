// Default trip list
const defaultTrips = [
    "KLIA Cargo", "MBG KLIA2", "MBG 163", "MBG AEON Maluri", "MBG NU Sentral",
    "MBG DPulze", "MBG Setapak Sentral", "MBG Selayang", "MBG Nilai", "MBG Redtick",
    "MBG AEON Shah Alam", "MBG IOI Putrajaya", "MBG MRT", "MBG Pavilion Bukit Jalil",
    "MBG Ampang", "MBG Bangsar", "MBG Setia Alam", "MBG Kota Daman sara"
];

// Load trips from localStorage or default
let trips = JSON.parse(localStorage.getItem("trips")) || defaultTrips;
const currentMonthKey = getCurrentMonthYear();
let dailyRecords = JSON.parse(localStorage.getItem(`dailyRecords_${currentMonthKey}`)) || {};

// On page load
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("date").value = new Date().toISOString().split("T")[0];
    document.getElementById("currentMonth").textContent = currentMonthKey;
    document.getElementById("supervisorName").textContent = localStorage.getItem("supervisorName") || "_______________";
    loadTrips();
    updateReport();

    // Airway Bill field visibility
    document.getElementById("destination").addEventListener("change", function () {
        const airwayBillField = document.getElementById("airwayBillField");
        if (this.value === "KLIA Cargo") {
            airwayBillField.style.display = "block"; // Show Airway Bill field
        } else {
            airwayBillField.style.display = "none"; // Hide Airway Bill field
            document.getElementById("airwayBill").value = ""; // Clear Airway Bill input
        }
    });

    // Add new trip functionality
    document.getElementById("addTripButton").addEventListener("click", function () {
        const newTrip = document.getElementById("newTrip").value.trim();
        if (newTrip) {
            if (!trips.includes(newTrip)) {
                trips.push(newTrip); // Add to the trips array
                localStorage.setItem("trips", JSON.stringify(trips)); // Save to localStorage
                loadTrips(); // Reload trips into the dropdown
                document.getElementById("newTrip").value = ""; // Clear the input field
                alert(`New destination "${newTrip}" added successfully!`);
            } else {
                alert(`"${newTrip}" already exists in the list.`);
            }
        } else {
            alert("Please enter a valid destination.");
        }
    });

    // Auto-save every 5 seconds
    setInterval(saveToLocal, 5000);

    // Print & Export PDF
    document.getElementById("printButton").addEventListener("click", printReport);
    document.getElementById("exportPDF").addEventListener("click", exportToPDF);
});

// Auto-generate current month & year
function getCurrentMonthYear() {
    const date = new Date();
    const monthNames = [
        "Januari", "Februari", "Mac", "April", "Mei", "Jun",
        "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

// Save to localStorage
function saveToLocal() {
    localStorage.setItem(`dailyRecords_${currentMonthKey}`, JSON.stringify(dailyRecords));
}

// Update report table
function updateReport() {
    let totalOT = 0;
    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";

    if (Object.keys(dailyRecords).length === 0) {
        document.getElementById("noRecordsMessage").style.display = "block";
    } else {
        document.getElementById("noRecordsMessage").style.display = "none";
    }

    // Sort dates in ascending order
    const sortedDates = Object.keys(dailyRecords).sort((a, b) => new Date(a) - new Date(b));

    // Iterate over sorted dates
    sortedDates.forEach(date => {
        const record = dailyRecords[date];
        const otHours = calculateOT(record.clock_in, record.clock_out, date, record.trips);
        totalOT += otHours;

        let rowClass = "";
        const dayOfWeek = new Date(date).getDay();
        if (dayOfWeek === 0) rowClass = "sunday"; // Sunday
        if (dayOfWeek === 6) rowClass = "saturday"; // Saturday

        // Append row to the table
        tbody.innerHTML += `
            <tr class="${rowClass}">
                <td>${date}</td>
                <td>${record.trips.join(", ") || "No trips"}</td>
                <td>${formatTime(record.clock_in)}</td>
                <td>${formatTime(record.clock_out)}</td>
                <td>${otHours.toFixed(2)}</td>
                <td>___________</td>
                <td>___________</td>
                <td><button class="delete-btn" onclick="deleteRecord('${date}')">Delete</button></td>
            </tr>
        `;
    });

    // Update total OT hours
    document.getElementById("totalOT").textContent = totalOT.toFixed(2);
}

// Format time for display
function formatTime(time) {
    return time ? time : "Not set";
}

// Calculate OT correctly
function calculateOT(clockIn, clockOut, date, trips) {
    if (!clockIn || !clockOut) return 0;

    // Special case: No OT for KLIA Cargo trips
    if (trips.some(trip => trip.startsWith("KLIA Cargo"))) return 0;

    // Convert time to minutes since midnight
    const convertToMinutes = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };

    const startTime = convertToMinutes(clockIn);
    const endTime = convertToMinutes(clockOut);

    // Handle cases where endTime crosses midnight
    const isNextDay = endTime < startTime; // Clock-out is on the next day
    const adjustedEndTime = isNextDay ? endTime + 24 * 60 : endTime;

    // Define OT thresholds
    const workEnd = 17 * 60; // 5 PM in minutes
    const saturdayThreshold = 14 * 60; // 2 PM in minutes

    let otMinutes = 0;

    // Sunday: Full day is OT
    if (new Date(date).getDay() === 0) {
        otMinutes = adjustedEndTime - startTime;
    }
    // Saturday: OT starts after 2 PM
    else if (new Date(date).getDay() === 6) {
        otMinutes = Math.max(adjustedEndTime - Math.max(startTime, saturdayThreshold), 0);
    }
    // Weekdays: OT starts after 5 PM
    else {
        otMinutes = Math.max(adjustedEndTime - Math.max(startTime, workEnd), 0);
    }

    // Convert OT minutes back to hours
    return otMinutes / 60;
}

// Export PDF using jsPDF + autoTable
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait', // Portrait orientation
        unit: 'mm',              // Millimeters as the unit
        format: 'a4'             // A4 paper size (210mm x 297mm)
    });

    // Header
    doc.setFontSize(14);
    doc.text("Borang Kerja Lebih Masa", 105, 10, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Nama: Khairul Reza | Department: WH3 Transport`, 14, 20);
    doc.text(`Bulan: ${currentMonthKey}`, 14, 28);
    doc.text(`Nama Ketua: ${localStorage.getItem("supervisorName") || "_______________"}`, 14, 36);

    // Table
    const tableData = [];
    Object.keys(dailyRecords).forEach(date => {
        const record = dailyRecords[date];
        tableData.push([
            date,
            record.trips.join(", ") || "No trips",
            formatTime(record.clock_in),
            formatTime(record.clock_out),
            calculateOT(record.clock_in, record.clock_out, date, record.trips).toFixed(2),
            "", // Empty cell for your signature
            ""  // Empty cell for supervisor signature
        ]);
    });

    doc.autoTable({
        startY: 42,
        head: [["Date", "Trips", "Clock-In", "Clock-Out", "OT Hours", "Your Signature", "Supervisor Signature"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak', halign: 'center' }, // Reduced font size
        headStyles: { fillColor: [200, 200, 200], fontSize: 10 }, // Slightly larger font for headers
        theme: "grid",
        columnStyles: {
            0: { cellWidth: 25 },  // Date column
            1: { cellWidth: 45 },  // Trips column (wider for wrapping)
            2: { cellWidth: 20 },  // Clock-In column
            3: { cellWidth: 20 },  // Clock-Out column
            4: { cellWidth: 15 },  // OT Hours column
            5: { cellWidth: 25 },  // Your Signature column
            6: { cellWidth: 25 }   // Supervisor Signature column
        }
    });

    // Total OT
    doc.text(`Jumlah OT Bulan Ini: ${document.getElementById("totalOT").textContent} Jam`, 14, doc.lastAutoTable.finalY + 10);

    // Save PDF
    doc.save("Borang_Kerja_Lebih_Masa.pdf");
}

// Print the report
function printReport() {
    window.print();
}

// Load trips into dropdown
function loadTrips() {
    const destinationDropdown = document.getElementById("destination");
    destinationDropdown.innerHTML = ""; // Clear existing options

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Select Destination --";
    destinationDropdown.appendChild(defaultOption);

    // Add all trips to the dropdown
    trips.forEach(trip => {
        const option = document.createElement("option");
        option.value = trip;
        option.textContent = trip;
        destinationDropdown.appendChild(option);
    });
}

// Handle form submissions
document.getElementById("clockForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const date = document.getElementById("date").value;
    const clockIn = document.getElementById("clockIn").value;
    const clockOut = document.getElementById("clockOut").value;

    if (!dailyRecords[date]) {
        dailyRecords[date] = { trips: [], clock_in: clockIn, clock_out: clockOut };
    } else {
        dailyRecords[date].clock_in = clockIn;
        dailyRecords[date].clock_out = clockOut;
    }

    saveToLocal();
    updateReport();
});

document.getElementById("tripForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const destination = document.getElementById("destination").value;
    const airwayBill = document.getElementById("airwayBill").value;

    const date = document.getElementById("date").value;

    // Initialize dailyRecords entry if it doesn't exist
    if (!dailyRecords[date]) {
        dailyRecords[date] = { trips: [], clock_in: "", clock_out: "" };
    }

    // Add trip with Airway Bill only if destination is KLIA Cargo
    if (destination === "KLIA Cargo") {
        dailyRecords[date].trips.push(`${destination} (${airwayBill})`);
    } else {
        dailyRecords[date].trips.push(destination);
    }

    saveToLocal();
    updateReport();

    // Reset form fields
    document.getElementById("destination").value = "";
    document.getElementById("airwayBill").value = "";
    document.getElementById("airwayBillField").style.display = "none"; // Hide Airway Bill field
});

// Delete a record by date
function deleteRecord(date) {
    if (confirm(`Are you sure you want to delete the record for ${date}?`)) {
        delete dailyRecords[date]; // Remove the record
        saveToLocal(); // Save updated records to localStorage
        updateReport(); // Refresh the table
    }
}