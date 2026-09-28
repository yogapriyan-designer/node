#!/usr/bin/env python3
"""
SMART ROOM FINDER - dataset builder.
Source of truth: the 10 uploaded timetable images (transcribed below, section by section).
Output: timetable.normalized.json  (rooms, sections, subjects, sessions, conflicts, data-quality log)

Cell DSL:  "<periodRange>:<label>[@room,room]"  separated by ';'
  - label = a subject slot letter (A..I), LAB, "<slot>-Proj", or free text as written on the sheet
  - no @room  -> class is held in the section's home venue
  - "G-625" on a sheet means slot G held in room 625 (slot table lists G as CDC-625), same for H-TB-106, I-108...
"""
import json, re
from collections import defaultdict

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

PERIODS_2026 = {1: ("09:00", "09:50"), 2: ("09:50", "10:40"), 3: ("10:50", "11:40"), 4: ("11:40", "12:30"),
                5: ("12:30", "13:20"), 6: ("13:20", "14:10"), 7: ("14:10", "15:00"), 8: ("15:10", "16:00"),
                9: ("16:00", "16:50")}
PERIODS_2024 = {1: ("09:00", "09:50"), 2: ("09:55", "10:45"), 3: ("10:50", "11:40"), 4: ("11:45", "12:35"),
                5: ("12:35", "13:30"), 6: ("13:30", "14:20"), 7: ("14:25", "15:15"), 8: ("15:20", "16:10"),
                9: ("16:15", "17:05")}


def S(code, name, credit, faculty, dept):
    return dict(code=code, name=name, credit=credit, faculty=faculty, dept=dept)


SECTIONS = []


def add(id, file_no, label, program, year, sem, acad, venue, half, grid, subjects, periods, status="active", notes=None):
    SECTIONS.append(dict(id=id, sourceFile=file_no, label=label, program=program, year=year, semester=sem,
                         academicYear=acad, venueRaw=venue, venueHalf=half, grid=grid, subjects=subjects,
                         periods=periods, status=status, notes=notes or []))


# ---------------------------------------------------------------- File 1: IV ECE-B
add("IV-ECE-B", 1, "IV ECE-B", "ECE", 4, 7, "2026-27", "IST 227", None,
    {"Mon": "1:C;2:A;3:E;4:F", "Tue": "1:C;2:E;3:F;4:B", "Wed": "1:C;2:D;3:A;4:B",
     "Thu": "1:D;2:B;3:LAB@108;4:A", "Fri": "1:E;2:D;3:F"},
    {"A": S("21GNH401T", "Behavioural Psychology", "2-1-0-3", "Dr.A.Annand", "AP/ECE"),
     "B": S("21ECC401T", "Wireless Communication and Antenna Systems", "3-0-0-3", "Dr.K.Vigneshwaran", "AP/ECE"),
     "C": S("21ECC402P", "Computer Communication and Network Security", "2-1-0-3", "Dr. R. Rajasekar", "ASP & HOD ECE-DS"),
     "D": S("21ECE461T", "Semiconductor Memory Design", "3-0-0-3", "Dr. H.SriBhuvaneshwari", "AP/ECE"),
     "E": S("21ECE463T", "Scripting Language for Electronic Design Automation", "3-0-0-3", "Dr. Sreenivasa Rao Ijada", "Prof/ECE"),
     "F": S("21CSO355T", "Machine learning for all", "3-0-0-3", "Dr.N.Prasanna Venkatesh", "AP/BME"),
     "LAB": S("21ECC402P", "Computer Communication and Network Security (Lab)", "2-1-0-3", "Ms.T.Swetha", "AP/ECE")},
    PERIODS_2026,
    notes=["Sheet has no morning/afternoon suffix on venue -> IST 227 assumed for all periods.",
           "Periods 6-9 are blank on the sheet (no classes)."])

# ---------------------------------------------------------------- File 2: IV ECE-A
add("IV-ECE-A", 2, "IV ECE-A", "ECE", 4, 7, "2026-27", "IST 225", None,
    {"Mon": "1:C;3:A;4:D", "Tue": "1:C;2:D;3:B;4:F", "Wed": "1:B;2:LAB@108;3:E;4:F",
     "Thu": "1:F;2:A;3:E;4:B", "Fri": "1:C;2:A;3:D;4:E"},
    {"A": S("21GNH401T", "Behavioural Psychology", "2-1-0-3", "Dr.A.Anand", "AP/ECE"),
     "B": S("21ECC401T", "Wireless Communication and Antenna Systems", "3-0-0-3", "Dr.K.Vigneshwaran", "AP/ECE"),
     "C": S("21ECC402P", "Computer Communication and Network Security", "2-1-0-3", "Dr.S.Jeevanantham", "AP/ECE-DS"),
     "D": S("21ECE461T", "Semiconductor Memory Design", "3-0-0-3", "Dr. H.SriBhuvaneshwari", "AP/ECE"),
     "E": S("21ECE463T", "Scripting Language for Electronic Design Automation", "3-0-0-3", "Dr. Sreenivasa Rao Ijada", "Prof/ECE"),
     "F": S("21CSO355T", "Machine learning for all", "3-0-0-3", "Dr.N.Prasanna Venkatesh", "AP/BME"),
     "LAB": S("21ECC402P", "Computer Communication and Network Security (Lab)", "2-1-0-3", "Mrs.T.Swetha", "AP/ECE")},
    PERIODS_2026,
    notes=["Monday period 2 is blank.", "Periods 6-9 are blank on the sheet."])

# ---------------------------------------------------------------- File 3: III ECE-DS
add("III-ECE-DS", 3, "III ECE-DS", "ECE-DS", 3, 5, "2026-27", "IST 519/FN", "FN",
    {"Mon": "1:E;2:B;3:C;4:A", "Tue": "1:C;2:B;3:D;4:F;6-7:LAB@108,107",
     "Wed": "1:H;2:B;3:A;4:C;8-9:G@625", "Thu": "1:A;2:D;3:E;4:F",
     "Fri": "1:D;2:A;3:E;4:B-Proj;6:G@625;8-9:LAB@108,107"},
    {"A": S("21MAB302T", "Discrete Mathematics", "3-1-0-4", "New faculty 2", "AP/Maths"),
     "B": S("21ECC301P", "Microprocessor, Microcontroller, and Interfacing Techniques", "3-1-0-4", "Mrs. B. Abirami", "EO/SRMIST"),
     "C": S("21ECC303T", "VLSI Design and Technology", "3-0-0-3", "Dr.R.Vinoth Raj", "AP/ECE-DS"),
     "D": S("21CSO355T", "Machine learning for all", "3-0-0-3", "Dr. Dr.Chitra Devi", "ASP/SoC"),
     "E": S("21ECE371T", "Database Design and Management", "3-0-0-3", "Dr. S.Saraswathi", "AP/SoC"),
     "F": S("21GNP301L", "Community connect", "0-0-2-1", "Dr. S.Jeevanantham / Dr.V. Manikandan", "AP/ECE-DS"),
     "G": S("21PDM301L", "Analytical and logical thinking skills", "0-0-2-0", "CDC-625", None),
     "H": S("21LEM301T", "Indian Art Form", "1-0-0-0", "Dr.Prabin Kumar Bera", "AP/ECE"),
     "LAB": S("21ECC311L", "VLSI Design/ Microprocessor Laboratory", "0-0-4-2", "Dr. R. Vinothraj / Dr. H. Sri Bhuvaneshwari", "AP/ECE DS, AP/ECE")},
    PERIODS_2026,
    notes=["Friday G-625 read as period 6 only (period 7 cell looks empty)."])

# ---------------------------------------------------------------- File 4: III ECE-B
add("III-ECE-B", 4, "III ECE-B", "ECE", 3, 5, "2026-27", "IST 518/AN", "AN",
    {"Mon": "1-2:LAB@108,309;6:E;7:B;8:A;9:D", "Tue": "1-2:G@625;6:F;7:B;8:D;9:C",
     "Wed": "1:G@625;6:B-Proj;7:B;8:A;9:H", "Thu": "1-2:LAB@108,309;6:A;7:C;8:E;9:F",
     "Fri": "6:C;7:A;8:E;9:D"},
    {"A": S("21MAB302T", "Discrete Mathematics", "3-1-0-4", "Dr.M.Thanga Rejini", "AP/Maths"),
     "B": S("21ECC301P", "Microprocessor, Microcontroller, and Interfacing Techniques", "3-1-0-4", "Mrs. B. Abirami", "EO/SRMIST"),
     "C": S("21ECC303T", "VLSI Design and Technology", "3-0-0-3", "Dr.R.Vinoth Raj", "AP/ECE-DS"),
     "D": S("21ECE468T", "System and Network on Chip", "3-0-0-3", "Dr.V. Manikandan", "AP/ECE-DS"),
     "E": S("21CSO355T", "Machine learning for all", "3-0-0-3", "Dr. J.Jencia", "AP/BME"),
     "F": S("21GNP301L", "Community connect", "0-0-2-1", "Dr. H. Sudharsan / Ms. T.Swetha", "AP/ECE"),
     "G": S("21PDM301L", "Analytical and logical thinking skills", "0-0-2-0", "CDC-625", None),
     "H": S("21LEM301T", "Indian Art Form", "1-0-0-0", "Dr. A.Anand", "AP/ECE"),
     "LAB": S("21ECC311L", "VLSI Design/ Microprocessor Laboratory", "0-0-4-2",
              "Dr.Sreenivasa Ijada Rao / Dr. B. DeviSri & Dr. Prassanna Venkatesh", "Prof./ECE, AP/ECE, AP/BME")},
    PERIODS_2026,
    notes=["Wednesday G-625 read as period 1 only."])

# ---------------------------------------------------------------- File 5: III ECE-A
add("III-ECE-A", 5, "III ECE-A", "ECE", 3, 5, "2026-27", "IST 518/FN", "FN",
    {"Mon": "1:E;2:B;3:B;4:A;6-7:G@625", "Tue": "1:H;2:D;3:B;4:B-Proj;7:G@625",
     "Wed": "1:C;2:A;3:D;4:F;8-9:LAB@108,309", "Thu": "1:A;2:E;3:C;4:F",
     "Fri": "1:D;2:A;3:E;4:C;6-7:LAB@108,309"},
    {"A": S("21MAB302T", "Discrete Mathematics", "3-1-0-4", "New Faculty 3", "AP/Maths"),
     "B": S("21ECC301P", "Microprocessor, Microcontroller, and Interfacing Techniques", "3-1-0-4", "Dr.M.Manikandan", "AP/ECE"),
     "C": S("21ECC303T", "VLSI Design and Technology", "3-0-0-3", "Dr.M.Jothi", "AP/ECE"),
     "D": S("21ECE468T", "System and Network on Chip", "3-0-0-3", "Dr.V. Manikandan", "AP/ECE-DS"),
     "E": S("21CSO355T", "Machine learning for all", "3-0-0-3", "Dr. J.Jencia", "AP/BME"),
     "F": S("21GNP301L", "Community connect", "0-0-2-1", "Dr.V .Rajesh / Dr. V.Bharathi", "AP/ECE"),
     "G": S("21PDM301L", "Analytical and logical thinking skills", "0-0-2-0", "CDC / 625", None),
     "H": S("21LEM301T", "Indian Art Form", "1-0-0-0", "Dr.K.Vigneshwaran", "AP/ECE"),
     "LAB": S("21ECC311L", "VLSI Design/ Microprocessor Laboratory", "0-0-4-2",
              "Dr.M.Jothi & Dr. P. Murugapandiyan / Dr.V. Manikandan", "AP/ECE, Prof./ECE, AP/ECE-DS")},
    PERIODS_2026)

# ---------------------------------------------------------------- File 6: III BME
add("III-BME", 6, "III-BME", "BME", 3, 5, "2026-27", "IST 211 / AN", "AN",
    {"Mon": "1-2:G@625;3-4:MPMC LAB@107;6:E;7:B;8:F;9:H",
     "Tue": "1-2:BIO DSP LAB@108;3:G@625;6:C;7:D;8:A;9:B",
     "Wed": "6:C;7:A;8:F;9:D", "Thu": "4:I@108;6:A;7:C;8:E;9:B",
     "Fri": "1:I@108;6:F;7:A;8:D;9:E"},
    {"A": S("21MAB301T", "Probability and Statistics", "3-1-0-4", "Dr. K. M. Karuppusamy", "AP/Maths"),
     "B": S("21BMC302J", "Microcontrollers and Its Application in Medicine", "3-0-2-4", "Dr.K.Vigneshwaran", "ASP/ECE"),
     "C": S("21BMC301J", "Biomedical Signal Processing", "3-0-2-4", "Dr. V.N. Senthilkumaran", "ASP & HOD / ECE"),
     "D": S("21BME266T", "Biometrics", "3-0-0-3", "Dr. G. Gifta", "AP/BME"),
     "E": S("21ECO103T", "Modern wireless communication system", "3-0-0-3", "Dr. Vaishnavi", "AP/ECE"),
     "F": S("21BMC303T", "Principles of Medical Imaging", "3-0-0-3", "Dr.N.Prasana venkatesh", "AP/BME"),
     "G": S("21PDM301L", "Analytical and Logical Thinking Skills", "0-0-2-0", "CDC-625", None),
     "H": S("21LEM301T", "Indian Art Form", "1-0-0-0", "Dr. G. Gifta", "AP/BME"),
     "I": S("21GNP301L", "Community Connect", "0-0-2-1", "Dr. J.Jencia / Dr.N.Prasanna Venkatesh", "AP/BME")},
    PERIODS_2026,
    notes=["'MPMC LAB' and 'BIO DSP LAB' are free-text labels on the sheet (no slot letter)."])

# ---------------------------------------------------------------- File 7: II ECE-DS B
add("II-ECE-DS-B", 7, "II-ECE-DS B", "ECE-DS", 2, 3, "2026-27", "IST 411/ AN", "AN",
    {"Mon": "3-4:LAB@309,107;6:D;7:B;8:C;9:I", "Tue": "1-2:LAB@309,107;6:C;7:D;8:E;9:A",
     "Wed": "1:G@401;6:I;7:E;8:A;9:D", "Thu": "1-2:G@401;3-4:H@TB-106;6:A;7:C;8:B;9:E",
     "Fri": "1:H@TB-106;6:F;7:A;8:B;9:C"},
    {"A": S("21MAB201T", "Transforms and Boundary Value Problems", "3-1-0-4", "NEW FACULTY 3", "AP/MAT"),
     "B": S("21ECC201T", "Solid State Devices", "3-0-0-3", "Dr. Jeevanantham S", "AP/ECE DS"),
     "C": S("21CSS201T", "Computer Organization and Architecture", "3-1-0-4", "Dr. P. Murugapandiyan", "Prof./ECE"),
     "D": S("21ECC203T", "Digital Logic Design", "3-0-0-3", "Dr.S.Krishnakumar", "AP/ECE DS"),
     "E": S("21ECC205T", "Electromagnetic Theory and Interference", "3-0-0-3", "Dr.V. Bharathi", "AP/ECE"),
     "F": S("21LEM201T", "Professional Ethics", "1-0-0-0", "Dr. K. Vigneshwaran", "AP/ECE"),
     "G": S("21LEM202T", "Universal Human Values-II", "2-1-0-3", "Mrs.D.Lavanya", "RS - ECE"),
     "H": S("21PDM201L", "Verbal Reasoning", "0-0-2-0", "CDC-TB-106", None),
     "I": S("21PDH209T", "Social Engineering", "2-0-0-2", "Mrs.D. Lavanya", "RS - ECE"),
     "LAB": S("21ECC211L", "Devices and Digital IC Laboratory", "0-0-4-2", "Dr.S.Krishnakumar", "AP/ECE DS")},
    PERIODS_2026)

# ---------------------------------------------------------------- File 8: II ECE-DS A
add("II-ECE-DS-A", 8, "II-ECE-DS A", "ECE-DS", 2, 3, "2026-27", "IST 416 / FN", "FN",
    {"Mon": "1:E;2:A;3-4:I;6-7:G@602;8-9:LAB@309,107", "Tue": "1:C;2:A;3:E;4:D;6:G@602;8-9:H@TB-106",
     "Wed": "1:A;2:B;3:C;4:D;7:H@TB-106", "Thu": "1:B;2:C;3:A;4:F;6-7:LAB@309,107",
     "Fri": "1:D;2:B;3:E;4:C"},
    {"A": S("21MAB201T", "Transforms and Boundary Value Problems", "3-1-0-4", "Dr.C. Arun Kumar", "AP/Maths"),
     "B": S("21ECC201T", "Solid State Devices", "3-0-0-3", "Dr. Jeevanantham S", "AP/ECE-DS"),
     "C": S("21CSS201T", "Computer Organization and Architecture", "3-1-0-4", "Dr. P. Murugapandiyan", "Prof./ECE"),
     "D": S("21ECC203T", "Digital Logic Design", "3-0-0-3", "Dr.S.Krishnakumar", "AP/ECE-DS"),
     "E": S("21ECC205T", "Electromagnetic Theory and Interference", "3-0-0-3", "Dr.V. Bharathi", "AP/ECE"),
     "F": S("21LEM201T", "Professional Ethics", "1-0-0-0", "Dr. Jothi M", "AP/ECE"),
     "G": S("21LEM202T", "Universal Human Values-II", "2-1-0-3", "Mrs.N.Suganthi", "RS - ECE"),
     "H": S("21PDM201L", "Verbal Reasoning", "0-0-2-0", "CDC - TB -106", None),
     "I": S("21PDH209T", "Social Engineering", "2-0-0-2", "Mrs.D. Lavanya", "RS - ECE"),
     "LAB": S("21ECC211L", "Devices and Digital IC Laboratory", "0-0-4-2", "Dr. Jeevanantham S / Dr.V. Bharathi", "AP/ECE-DS, AP/ECE")},
    PERIODS_2026,
    notes=["Monday slot I (Social Engineering) spans periods 3-4 with no room written -> home venue assumed."])

# ---------------------------------------------------------------- File 9: II BME
add("II-BME", 9, "II-BME", "BME", 2, 3, "2026-27", "IST 602 / FN", "FN",
    {"Mon": "1:E;2:C;3-4:I;6-7:DLMS/EEC LAB@107,309", "Tue": "1:C;2:E;3:B;4:A;6-7:H@TB-106",
     "Wed": "1:B;2:D;3:A;6:H@TB-106;7:G@602", "Thu": "1:A;2:E;3:B;4:D;8-9:DLMS/EEC LAB@107,309",
     "Fri": "1:F;2:A;3:C;4:D;8-9:G@602"},
    {"A": S("21MAB201T", "Transforms and Boundary Value Problems", "3-1-0-4", "Dr.A.Manickam", "ASP/MAT"),
     "B": S("21BMC202T", "Biomedical Signals and Systems", "3-0-0-3", "Dr. Senthil Kumaran V N", "ASP & HOD / ECE"),
     "C": S("21BMC203J", "Electric and Electronic Circuits", "3-0-2-4", "Dr. Prabin Kumar Bera", "AP/ECE"),
     "D": S("21BMC204J", "Digital Logic for Medical Systems", "2-0-2-3", "Dr. G. Gifta", "AP/BME"),
     "E": S("21PYS202T", "Medical Physics", "3-0-0-3", "Dr.D.Rajeswari", "ASP/PHY"),
     "F": S("21LEM201T", "Professional Ethics", "1-0-0-0", "Dr. H.SriBhuvaneshwari", "AP/ECE"),
     "G": S("21LEM202T", "Universal Human Values-II", "2-1-0-3", "Mrs.N.Suganthi", "RS - ECE"),
     "H": S("21PDM201L", "Verbal Reasoning", "0-0-2-0", "CDC-TB-106", None),
     "I": S("21PDH201T", "Social Engineering", "2-0-0-2", "Mrs. Francis Arockiya Mary", "RS - EEE")},
    PERIODS_2026,
    notes=["'DLMS/EEC LAB' = free-text label (likely Digital Logic for Medical Systems / Electric & Electronic Circuits labs) - not linked to a slot.",
           "Wednesday period 4 is blank."])

# ---------------------------------------------------------------- File 10: I ECE-A (2024-25!)
add("I-ECE-A-2024", 10, "I ECE-A", "ECE", 1, 1, "2024-25", "IST602", None,
    {"Mon": "1:E;2:E;3:B;4:A;6-7:Che lab;8:F@710;9:CDC@710",
     "Tue": "1:C;2:B;3:A;4:D;6-9:Workshop@20,21",
     "Wed": "1:B;2:E;3:D;6-7:PPS Lab@618;8-9:PCB Lab@108",
     "Thu": "2-3:German@602;4:A;6:CDC@510;7:CDC@510;8-9:NSS@201",
     "Fri": "1:D;2:A;3:C;4:B;6:F;7-9:German@626"},
    {"E": S("21GNH101J", "Philosophy of Engineering", "1-0-2-2", "Dr. R. Aarthi", "AP/Phy"),
     "A": S("21MAB102T", "Advanced Calculus and Complex Analysis", "3-1-0-4", "Dr. R. Ragul", "AP / Maths"),
     "B": S("21CYB101J", "Chemistry", "3-1-2-5", "Dr. P. Pachamuthu", "AP/Che"),
     "C": S("21BTB102J", "Electronic System and PCB Design", "2-0-0-2", "Dr. U. Shajith Ali", "Asso.Prof/EEE"),
     "D": S("21CSS101J", "Programming for Problem Solving", "3-0-2-4", "Dr. A. Rama Prasath", "Asso.Prof/CA"),
     "F": S("21BTB103T", "Biology", "2-0-0-2", "Dr. M. Jaya Priya", "AP/Biotech."),
     "German": S("21LEH104T", "German", "2-1-0-3", "Mr. Selva", "German"),
     "NSS": S("21GNM102L", "NSS", "0-0-2-0", "Dr. R. Manickam", "Physical Director")},
    PERIODS_2024, status="stale_needs_confirmation",
    notes=["Header says ODD SEMESTER (2024-25) - two academic years older than the other 9 sheets (2026-27), with different period timings.",
           "Uses IST602 for all theory periods, which is the home venue of II-BME (FN) in 2026-27 -> would create massive false conflicts if treated as live.",
           "Friday 'German IST626' read as spanning periods 7-9 (text is centred over P7-P9) - span is a low-confidence reading.",
           "'Che lab' has no room on the sheet (unresolved). 'Workshop (IST 20,21)' read as rooms 20 and 21.",
           "Wednesday 'PPS LAB IST 618' and 'PCB Lab IST 108' room numbers are handwritten."])

# =====================================================================================
TOKEN = re.compile(r"^(\d)(?:-(\d))?:(.+?)(?:@(.+))?$")


def norm_room(r):
    r = r.strip().upper().replace(" ", "")
    if r.startswith("TB-"):
        return r
    if r.startswith("IST"):
        r = r[3:].lstrip("-")
    return "IST-" + r


def slot_of(label):
    if label.endswith("-Proj"):
        return label[0], "project"
    return label, None


def mins(t):
    h, m = t.split(":")
    return int(h) * 60 + int(m)


sessions, quality = [], []
sid = 0
for sec in SECTIONS:
    home = norm_room(sec["venueRaw"].split("/")[0])
    per = sec["periods"]
    for day in DAYS:
        for tok in [t for t in sec["grid"].get(day, "").split(";") if t]:
            m = TOKEN.match(tok)
            assert m, (sec["id"], day, tok)
            p1, p2, label, rooms = int(m[1]), int(m[2] or m[1]), m[3], m[4]
            slot, mode = slot_of(label)
            subj = sec["subjects"].get(slot)
            if rooms:
                room_list, rsrc = [norm_room(x) for x in rooms.split(",")], "explicit"
            elif label in ("Che lab",):
                room_list, rsrc = [], "unresolved"
                quality.append(dict(level="warning", section=sec["id"], day=day,
                                    msg="'Che lab' has no room on the sheet; cannot be placed on the floor map."))
            else:
                room_list, rsrc = [home], "home_venue"
                half = sec["venueHalf"]
                if half == "FN" and p1 > 4 or half == "AN" and p2 < 6:
                    quality.append(dict(level="warning", section=sec["id"], day=day,
                                        msg=f"Home-venue class '{label}' in period {p1}-{p2} falls outside the venue's {half} half."))
            kind = ("lab" if slot == "LAB" or "lab" in label.lower() else "project" if mode == "project"
                    else "theory" if subj else "other")
            sid += 1
            sessions.append(dict(
                id=f"S{sid:03d}", sectionId=sec["id"], day=day, periodStart=p1, periodEnd=p2,
                start=per[p1][0], end=per[p2][1], slot=slot if subj else None, label=label, mode=mode, kind=kind,
                subjectCode=subj["code"] if subj else None,
                subjectName=subj["name"] if subj else label,
                faculty=subj["faculty"] if subj else None,
                rooms=room_list, roomSource=rsrc, sourceFile=sec["sourceFile"], status=sec["status"]))

# ---- rooms
rooms = {}
for s in sessions:
    for r in s["rooms"]:
        d = rooms.setdefault(r, dict(id=r, sessionIds=[], sections=set(), usage=set(), sources=set()))
        d["sessionIds"].append(s["id"]); d["sections"].add(s["sectionId"])
        d["usage"].add(s["kind"]); d["sources"].add(s["sourceFile"])
for sec in SECTIONS:
    r = norm_room(sec["venueRaw"].split("/")[0])
    rooms.setdefault(r, dict(id=r, sessionIds=[], sections=set(), usage=set(), sources=set()))
    rooms[r]["sections"].add(sec["id"]); rooms[r]["sources"].add(sec["sourceFile"])
    rooms[r].setdefault("homeFor", []).append(dict(section=sec["id"], half=sec["venueHalf"] or "ALL"))

out_rooms = []
for r, d in sorted(rooms.items()):
    m = re.match(r"IST-(\d{3})$", r)
    floor = int(m[1][0]) if m else (1 if r == "TB-106" else None)
    only_sec = [s for s in sessions if r in s["rooms"]]
    lab_like = any(s["kind"] == "lab" for s in only_sec) and not d.get("homeFor")
    out_rooms.append(dict(
        id=r, building="TB" if r.startswith("TB") else "IST", displayName=r.replace("-", " "),
        floorInferred=floor, floorConfirmed=False,
        floorBasis="hundreds digit of room number (assumption - needs confirmation)" if floor is not None else "cannot infer from number",
        roomTypeHint="lab" if lab_like else ("classroom" if d.get("homeFor") else "shared/other"),
        homeFor=d.get("homeFor", []), usageKinds=sorted(d["usage"]), sections=sorted(d["sections"]),
        sourceFiles=sorted(d["sources"]), sessionIds=d["sessionIds"],
        ac=None, capacity=None, facilities=None,
        onlyInStaleSheet=d["sources"] == {10}))

# ---- conflicts (room double-booking) : active sheets vs stale sheet handled separately
def overlap(a, b):
    return mins(a["start"]) < mins(b["end"]) and mins(b["start"]) < mins(a["end"])

conflicts = []
by_room_day = defaultdict(list)
for s in sessions:
    for r in s["rooms"]:
        by_room_day[(r, s["day"])].append(s)
for (r, day), lst in sorted(by_room_day.items()):
    for i in range(len(lst)):
        for j in range(i + 1, len(lst)):
            a, b = lst[i], lst[j]
            if a["sectionId"] != b["sectionId"] and overlap(a, b):
                stale = "stale_needs_confirmation" in (a["status"], b["status"])
                conflicts.append(dict(
                    room=r, day=day, sessions=[a["id"], b["id"]], sections=[a["sectionId"], b["sectionId"]],
                    window=f"{max(a['start'], b['start'])}-{min(a['end'], b['end'])}",
                    labels=[a["label"], b["label"]], category="stale_sheet_overlap" if stale else "live_conflict",
                    note=("Involves the 2024-25 sheet (file 10); expected because of different academic year."
                          if stale else "Two 2026-27 sheets claim the same room at the same time. Kept both; needs admin resolution.")))

# ---- misc data-quality notes
quality += [
    dict(level="info", msg="No sheet lists room capacity, AC/non-AC or facilities. Fields are null; AI finder must not invent them."),
    dict(level="info", msg="Floors are inferred from room numbers (hundreds digit) and are unconfirmed."),
    dict(level="info", msg="Availability = 'not booked in these 10 timetables'. Other sections/departments may still use these rooms."),
    dict(level="info", msg="IV ECE-A/B lab cells (IST 108) occupy a single period on the sheet; labs elsewhere span 2-3 periods. Kept as written."),
    dict(level="info", msg="Sheets 3-9 use FN/AN venue suffixes: home venue applies only to that half of the day (FN = periods 1-4, AN = 6-9)."),
    dict(level="info", msg="TB-106 kept as a separate room from IST-106 (building not confirmed)."),
]
for sec in SECTIONS:
    for n in sec["notes"]:
        quality.append(dict(level="note", section=sec["id"], msg=n))

for sec in SECTIONS:
    sec.pop("grid")
data = dict(
    meta=dict(generatedFrom="10 uploaded timetable images", sheets=10, days=DAYS,
              periods={"2026-27": {k: list(v) for k, v in PERIODS_2026.items()},
                       "2024-25": {k: list(v) for k, v in PERIODS_2024.items()}},
              lunchPeriod=5, teaBreaks=[["10:40", "10:50"], ["15:00", "15:10"]]),
    sections=SECTIONS, rooms=out_rooms, sessions=sessions, conflicts=conflicts, dataQuality=quality)
with open("room-timetable.normalized.json", "w") as f:
    json.dump(data, f, indent=1)

# ---- console report
print("SHEETS/SECTIONS:", len(SECTIONS))
for sec in SECTIONS:
    n = sum(1 for s in sessions if s["sectionId"] == sec["id"])
    print(f"  file {sec['sourceFile']:>2} {sec['id']:<12} {sec['academicYear']} venue={sec['venueRaw']:<12} sessions={n}")
print("TOTAL SESSIONS:", len(sessions))
print("UNIQUE ROOMS:", len(out_rooms))
for r in out_rooms:
    print(f"  {r['id']:<8} floor~{r['floorInferred']} {r['roomTypeHint']:<10} sessions={len(r['sessionIds']):>2} files={r['sourceFiles']}")
live = [c for c in conflicts if c["category"] == "live_conflict"]
stale = [c for c in conflicts if c["category"] != "live_conflict"]
print("LIVE CONFLICTS:", len(live))
for c in live:
    print("  ", c["room"], c["day"], c["window"], c["sections"], c["labels"])
print("STALE-SHEET OVERLAPS:", len(stale))
for c in stale:
    print("  ", c["room"], c["day"], c["window"], c["sections"])
print("WARNINGS:", [q["msg"] for q in quality if q["level"] == "warning"])

# also emit data.js (loaded by index.html)
open("room-data.js", "w").write("window.DATA=" + json.dumps(data, separators=(",", ":")) + ";")
