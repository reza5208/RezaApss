// Constants
const defaultTrips = [
    "KLIA Cargo", "MBG KLIA2", "MBG 163", "MBG AEON Maluri", "MBG NU Sentral",
    "MBG DPulze", "MBG Setapak Sentral", "MBG Selayang", "MBG Nilai", "MBG Redtick",
    "MBG AEON Shah Alam", "MBG IOI Putrajaya", "MBG MRT", "MBG Pavilion Bukit Jalil",
    "MBG Ampang", "MBG Bangsar", "MBG Setia Alam", "MBG Kota Damansara"
];

// State
let trips = JSON.parse(localStorage.getItem("trips")) || defaultTrips;
let currentMonthKey = getCurrentMonthYear();
let dailyRecords = JSON.parse(localStorage.getItem(`dailyRecords_${currentMonthKey}`)) || {};

// On page load
document.addEventListener("DOMContentLoaded", () => {
    initializePage();
    setupEventListeners();
});

// Initialize the page
function initializePage() {
    const monthYearInput = document.getElementById("monthYear");
    const currentDate = new Date();
    monthYearInput.value = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

    document.getElementById("date").value = new Date().toISOString().split("T")[0];
    document.getElementById("currentMonth").textContent = currentMonthKey;
    document.getElementById("supervisorName").textContent = localStorage.getItem("supervisorName") || "Talib";
    loadTrips();
    updateReport();
}

// Set up event listeners
function setupEventListeners() {
    document.getElementById("monthYear").addEventListener("change", handleMonthChange);
    document.getElementById("destination").addEventListener("change", handleDestinationChange);
    document.getElementById("addTripButton").addEventListener("click", handleAddTrip);
    document.getElementById("clockForm").addEventListener("submit", handleClockFormSubmit);
    document.getElementById("tripForm").addEventListener("submit", handleTripFormSubmit);
    document.getElementById("printButton").addEventListener("click", printReport);
    document.getElementById("exportPDF").addEventListener("click", exportToPDF);

    setInterval(saveToLocal, 5000); // Auto-save every 5 seconds
}

// Handle month change
function handleMonthChange() {
    const [year, month] = this.value.split("-");
    currentMonthKey = `${getMonthName(month)} ${year}`;
    dailyRecords = JSON.parse(localStorage.getItem(`dailyRecords_${currentMonthKey}`)) || {};
    updateReport();
}

// Handle destination change
function handleDestinationChange() {
    const airwayBillField = document.getElementById("airwayBillField");
    if (this.value === "KLIA Cargo") {
        airwayBillField.style.display = "block";
    } else {
        airwayBillField.style.display = "none";
        document.getElementById("airwayBill").value = "";
    }
}

// Handle add trip
function handleAddTrip() {
    const newTrip = document.getElementById("newTrip").value.trim();
    if (newTrip) {
        if (!trips.includes(newTrip)) {
            trips.push(newTrip);
            localStorage.setItem("trips", JSON.stringify(trips));
            loadTrips();
            document.getElementById("newTrip").value = "";
            alert(`Destinasi baru "${newTrip}" berjaya ditambah!`);
        } else {
            alert(`"${newTrip}" sudah wujud dalam senarai.`);
        }
    } else {
        alert("Sila masukkan destinasi yang sah.");
    }
}

// Handle clock form submission
function handleClockFormSubmit(e) {
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
}

// Handle trip form submission
function handleTripFormSubmit(e) {
    e.preventDefault();
    const destination = document.getElementById("destination").value;
    const airwayBill = document.getElementById("airwayBill").value;
    const date = document.getElementById("date").value;

    if (!dailyRecords[date]) {
        dailyRecords[date] = { trips: [], clock_in: "", clock_out: "" };
    }

    if (destination === "KLIA Cargo") {
        dailyRecords[date].trips.push(`${destination} (${airwayBill})`);
    } else {
        dailyRecords[date].trips.push(destination);
    }

    saveToLocal();
    updateReport();

    document.getElementById("destination").value = "";
    document.getElementById("airwayBill").value = "";
    document.getElementById("airwayBillField").style.display = "none";
}

// Delete a record by date
function deleteRecord(date) {
    if (confirm(`Adakah anda pasti ingin memadam rekod untuk ${date}?`)) {
        delete dailyRecords[date];
        saveToLocal();
        updateReport();
    }
}

// Helper functions
function getCurrentMonthYear() {
    const date = new Date();
    const monthNames = [
        "Januari", "Februari", "Mac", "April", "Mei", "Jun",
        "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthName(month) {
    const monthNames = [
        "Januari", "Februari", "Mac", "April", "Mei", "Jun",
        "Julai", "Ogos", "September", "Oktober", "November", "Disember"
    ];
    return monthNames[parseInt(month) - 1];
}

function saveToLocal() {
    localStorage.setItem(`dailyRecords_${currentMonthKey}`, JSON.stringify(dailyRecords));
}

function loadTrips() {
    const destinationDropdown = document.getElementById("destination");
    destinationDropdown.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Pilih Destinasi --";
    destinationDropdown.appendChild(defaultOption);

    trips.forEach(trip => {
        const option = document.createElement("option");
        option.value = trip;
        option.textContent = trip;
        destinationDropdown.appendChild(option);
    });
}

function updateReport() {
    let totalOT = 0;
    const tbody = document.querySelector("#reportTable tbody");
    tbody.innerHTML = "";

    if (Object.keys(dailyRecords).length === 0) {
        document.getElementById("noRecordsMessage").style.display = "block";
    } else {
        document.getElementById("noRecordsMessage").style.display = "none";
    }

    const sortedDates = Object.keys(dailyRecords).sort((a, b) => new Date(a) - new Date(b));

    sortedDates.forEach(date => {
        const record = dailyRecords[date];
        const otHours = calculateOT(record.clock_in, record.clock_out, date, record.trips);
        totalOT += otHours;

        let rowClass = "";
        const dayOfWeek = new Date(date).getDay();
        if (dayOfWeek === 0) rowClass = "sunday";
        if (dayOfWeek === 6) rowClass = "saturday";

        const row = document.createElement("tr");
        row.className = rowClass;
        row.innerHTML = `
            <td>${formatDateForPDF(date)}</td>
            <td>${record.trips.join(", ") || "Tiada destinasi"}</td>
            <td>${formatTime(record.clock_in)}</td>
            <td>${formatTime(record.clock_out)}</td>
            <td>${otHours.toFixed(2)}</td>
            <td class="print-only"></td>
            <td class="print-only"></td>
            <td><button class="delete-btn" onclick="deleteRecord('${date}')">Padam</button></td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById("totalOT").textContent = totalOT.toFixed(2);
}

function formatDateForPDF(date) {
    const [year, month, day] = date.split("-");
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year.slice(-2)}`;
}

function formatTime(time) {
    return time ? time : "Tiada rekod";
}

function calculateOT(clockIn, clockOut, date, trips) {
    if (!clockIn || !clockOut) return 0;

    const convertToMinutes = (time) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    };

    const startTime = convertToMinutes(clockIn);
    const endTime = convertToMinutes(clockOut);
    const isNextDay = endTime < startTime;
    const adjustedEndTime = isNextDay ? endTime + 24 * 60 : endTime;

    const workEnd = 17 * 60; // Weekday work ends at 17:00
    const saturdayThreshold = 14 * 60; // Saturday work ends at 14:00

    let otMinutes = 0;

    if (new Date(date).getDay() === 0) {
        // Sunday: Count all hours as OT, regardless of trips
        otMinutes = adjustedEndTime - startTime;
    } else {
        // For other days, check for "KLIA Cargo" trips
        if (trips.some(trip => trip.startsWith("KLIA Cargo"))) return 0;

        if (new Date(date).getDay() === 6) {
            // Saturday: OT starts after 14:00
            otMinutes = Math.max(adjustedEndTime - Math.max(startTime, saturdayThreshold), 0);
        } else {
            // Weekdays: OT starts after 17:00
            otMinutes = Math.max(adjustedEndTime - Math.max(startTime, workEnd), 0);
        }
    }

    return otMinutes / 60;
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFontSize(14);
    doc.text("Borang Kerja Lebih Masa", 105, 10, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Nama: Khairul Reza | Department: WH3 Transport`, 14, 20);
    doc.text(`Bulan: ${currentMonthKey}`, 14, 28);
    doc.text(`Nama Ketua: ${localStorage.getItem("supervisorName") || "Talib"}`, 14, 36);

    const tableData = [];
    Object.keys(dailyRecords).forEach(date => {
        const record = dailyRecords[date];
        tableData.push([
            formatDateForPDF(date),
            record.trips.join(", ") || "Tiada destinasi",
            formatTime(record.clock_in),
            formatTime(record.clock_out),
            calculateOT(record.clock_in, record.clock_out, date, record.trips).toFixed(2),
            "",
            ""
        ]);
    });

    doc.autoTable({
        startY: 42,
        head: [["Tarikh", "Destinasi", "Clock-In", "Clock-Out", "OT Hours", "Tandatangan Anda", "Tandatangan Penyelia"]],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 1, overflow: 'linebreak', halign: 'center' },
        headStyles: { fillColor: [200, 200, 200], fontSize: 10 },
        theme: "grid",
        columnStyles: {
            0: { cellWidth: 25 },  // Tarikh
            1: { cellWidth: 55 },  // Destinasi
            2: { cellWidth: 20 },  // Clock-In
            3: { cellWidth: 20 },  // Clock-Out
            4: { cellWidth: 15 },  // OT Hours
            5: { cellWidth: 25 },  // Tandatangan Anda
            6: { cellWidth: 25 }   // Tandatangan Penyelia
        }
    });

    doc.setFontSize(12);
    doc.text(`Jumlah OT Bulan Ini: ${document.getElementById("totalOT").textContent} Jam`, 14, doc.lastAutoTable.finalY + 10);

    // Add signature section
    doc.setFontSize(10);
    doc.text("Disediakan Oleh:", 14, 270); // Label for Prepared By
    doc.text("Khairul Reza", 14, 275); // Your name
    doc.line(14, 276, 64, 276); // Line for signature

    doc.text("Disahkan Oleh:", 140, 270); // Label for Approved By
    doc.text("Talib", 140, 275); // Supervisor's name
    doc.line(140, 276, 190, 276); // Line for signature

    // Save the PDF
    doc.save(`Borang_Kerja_Lebih_Masa_${currentMonthKey}.pdf`);
}

function printReport() {
    window.print();
}
