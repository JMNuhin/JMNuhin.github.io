// --- State and Mock Database (LocalStorage fallback for Supabase) ---
const DEFAULT_DATA = {
    profile: {
        name: "Alex Doe",
        role: "Full Stack Developer & Designer",
        bio: "I build responsive, dynamic, and beautiful web applications. With a passion for clean code and intuitive user experiences, I strive to create products that make a difference.",
        avatar: "https://via.placeholder.com/150/040d21/00f0ff?text=AD"
    },
    experience: [
        { id: 1, title: "Senior Developer", company: "Tech Solutions Inc.", duration: "2021 - Present", desc: "Led a team of 5 developers to build scalable enterprise applications." },
        { id: 2, title: "Web Developer", company: "Creative Agency", duration: "2018 - 2021", desc: "Designed and developed highly interactive marketing websites." }
    ],
    projects: [
        { id: 1, title: "E-Commerce Platform", tags: "React, Node.js", desc: "A full-featured online store with payment processing.", link: "#" },
        { id: 2, title: "Task Manager", tags: "Vanilla JS, CSS3", desc: "A sleek, drag-and-drop task management tool.", link: "#" }
    ],
    reviews: [
        { id: 1, name: "Jane Smith", date: "2023-10-15", text: "Alex is an outstanding developer with a great eye for design!", role: "Product Manager" }
    ],
    customSections: [] // e.g., Education
};

// --- Supabase Setup ---
const supabaseUrl = 'https://potcfhvaptudawnbyoeo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdGNmaHZhcHR1ZGF3bmJ5b2VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTAzMjUsImV4cCI6MjA5ODM4NjMyNX0.X7JY7dZ6zpddgQMq_88-0-6FID_Utk20LF9U-v7y1hk';
let supabase = null;
try {
    if (window.supabase) {
        supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    }
} catch (e) {
    console.error("Could not initialize Supabase:", e);
}

// Safely merge localData as the initial state so we don't lose the user's edits!
let localData = JSON.parse(localStorage.getItem('portfolioData')) || null;
let appData = localData ? { ...DEFAULT_DATA, ...localData } : { ...DEFAULT_DATA };
if (!appData.customSections) appData.customSections = [];

let isAdmin = false;

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", async () => {
    checkRoute();
    window.addEventListener("hashchange", checkRoute);
    
    // Auth Event Listeners
    const loginBtn = document.getElementById("loginBtn");
    const pwdInput = document.getElementById("adminPassword");
    
    if (loginBtn) loginBtn.addEventListener("click", handleLogin);
    if (pwdInput) {
        pwdInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleLogin();
        });
    }
    
    // Setup Editable Elements
    setupEditables();
    
    // Fetch Data from Supabase
    if (supabase) {
        try {
            const { data, error } = await supabase.from('portfolio_data').select('data').eq('id', 1).single();
            
            if (error) {
                console.warn("Supabase returned an error (it might be RLS or table setup). Falling back to local data.", error);
            } else if (data && data.data) {
                let fetchedData = data.data;
                if (Object.keys(fetchedData).length === 0) {
                    // Supabase is empty '{}'. Push our local appData up to Supabase!
                    await supabase.from('portfolio_data').update({ data: appData }).eq('id', 1);
                } else {
                    // Supabase has real data! Use it.
                    appData = { ...DEFAULT_DATA, ...fetchedData };
                    if (!appData.customSections) appData.customSections = [];
                    // Sync local storage to match Supabase
                    localStorage.setItem('portfolioData', JSON.stringify(appData));
                }
            }
        } catch (e) {
            console.error("Supabase network error:", e);
        }
    }
    
    // Render Data
    renderAll();
});

// --- Routing & Auth ---
function checkRoute() {
    const hash = window.location.hash;
    const modal = document.getElementById("authModal");
    
    if (hash === "#admin" && !isAdmin) {
        modal.classList.add("show");
    } else {
        modal.classList.remove("show");
    }
    
    if (isAdmin) {
        document.body.classList.add("admin-mode");
        // Hide viewer only stuff
        document.querySelectorAll('.viewer-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    } else {
        document.body.classList.remove("admin-mode");
        // Show viewer only stuff
        document.querySelectorAll('.viewer-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

function handleLogin() {
    const pwd = document.getElementById("adminPassword").value;
    // For demo purposes, password is 'admin'
    if (pwd === "admin") {
        isAdmin = true;
        document.getElementById("authModal").classList.remove("show");
        document.getElementById("authError").style.display = "none";
        checkRoute();
        renderAll(); // Crucial: Re-render to show all editable fields!
    } else {
        document.getElementById("authError").style.display = "block";
    }
}

// --- Data Saving ---
async function saveData() {
    // Keep local storage as backup
    localStorage.setItem('portfolioData', JSON.stringify(appData));
    
    // Re-render UI instantly for snappy experience
    renderAll();

    // Push to Supabase in background
    if (supabase) {
        try {
            await supabase.from('portfolio_data').update({ data: appData }).eq('id', 1);
        } catch (e) {
            console.error("Failed to save to Supabase:", e);
        }
    }
}

// --- Rendering ---
function renderAll() {
    // Profile
    document.getElementById("hero-name").innerText = appData.profile.name;
    document.getElementById("sidebar-name").innerText = appData.profile.name;
    document.getElementById("hero-title").innerText = appData.profile.role;
    document.getElementById("sidebar-role").innerText = appData.profile.role;
    document.getElementById("hero-bio").innerText = appData.profile.bio;
    document.getElementById("sidebar-avatar").src = appData.profile.avatar;

    // Experience
    const expList = document.getElementById("experience-list");
    expList.innerHTML = "";
    appData.experience.forEach(exp => {
        expList.innerHTML += `
            <div class="timeline-item">
                ${isAdmin ? `<div class="item-actions"><button class="btn-icon delete-btn" onclick="deleteExperience(${exp.id})"><i class="fa-solid fa-trash"></i></button></div>` : ''}
                <h3 class="${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'experience', ${exp.id}, 'title')">${exp.title}</h3>
                <div class="company ${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'experience', ${exp.id}, 'company')">${exp.company}</div>
                <div class="duration ${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'experience', ${exp.id}, 'duration')">${exp.duration}</div>
                <p class="${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'experience', ${exp.id}, 'desc')">${exp.desc}</p>
            </div>
        `;
    });

    // Projects
    const projList = document.getElementById("projects-list");
    projList.innerHTML = "";
    appData.projects.forEach(proj => {
        projList.innerHTML += `
            <div class="card">
                ${isAdmin ? `<div class="item-actions"><button class="btn-icon delete-btn" onclick="deleteProject(${proj.id})"><i class="fa-solid fa-trash"></i></button></div>` : ''}
                <h3 class="${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'projects', ${proj.id}, 'title')">${proj.title}</h3>
                <div class="tags ${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'projects', ${proj.id}, 'tags')">
                    ${proj.tags.split(',').map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
                </div>
                <p class="${isAdmin ? 'editable' : ''}" onclick="editListText(event, 'projects', ${proj.id}, 'desc')">${proj.desc}</p>
                <div class="card-actions">
                    <a href="${proj.link}" class="card-link" onclick="${isAdmin ? 'event.preventDefault(); editListText(event, \'projects\', ' + proj.id + ', \'link\');' : ''}">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                </div>
            </div>
        `;
    });

    // Dynamic Sections (Nav and Content)
    const dynNav = document.getElementById("dynamic-nav-links");
    const dynSec = document.getElementById("dynamic-sections");
    if (dynNav) dynNav.innerHTML = "";
    if (dynSec) dynSec.innerHTML = "";
    
    appData.customSections.forEach(sec => {
        // Nav Link
        if (dynNav) {
            dynNav.innerHTML += `<a href="#sec-${sec.id}" class="nav-link"><i class="fa-solid fa-bookmark"></i> ${sec.title}</a>`;
        }
        
        // Section Content
        let itemsHTML = sec.items.map(item => `
            <div class="timeline-item">
                ${isAdmin ? `<div class="item-actions"><button class="btn-icon delete-btn" onclick="deleteCustomItem(${sec.id}, ${item.id})"><i class="fa-solid fa-trash"></i></button></div>` : ''}
                <h3 class="${isAdmin ? 'editable' : ''}" onclick="editCustomItemText(event, ${sec.id}, ${item.id}, 'title')">${item.title}</h3>
                <div class="company ${isAdmin ? 'editable' : ''}" onclick="editCustomItemText(event, ${sec.id}, ${item.id}, 'subtitle')">${item.subtitle}</div>
                <div class="duration ${isAdmin ? 'editable' : ''}" onclick="editCustomItemText(event, ${sec.id}, ${item.id}, 'date')">${item.date}</div>
                <p class="${isAdmin ? 'editable' : ''}" onclick="editCustomItemText(event, ${sec.id}, ${item.id}, 'desc')">${item.desc}</p>
            </div>
        `).join('');

        if (dynSec) {
            dynSec.innerHTML += `
                <section id="sec-${sec.id}" class="section">
                    <h2 class="section-title">
                        <span class="${isAdmin ? 'editable' : ''}" onclick="editSectionTitle(event, ${sec.id})">${sec.title}</span> 
                        <button class="btn-icon add-btn admin-only" onclick="addCustomItem(${sec.id})"><i class="fa-solid fa-plus"></i></button>
                        ${isAdmin ? `<button class="btn-icon delete-btn admin-only" style="margin-left: 10px;" onclick="deleteSection(${sec.id})" title="Delete entire section"><i class="fa-solid fa-trash"></i></button>` : ''}
                    </h2>
                    <div class="timeline">
                        ${itemsHTML}
                    </div>
                </section>
            `;
        }
    });

    // Reviews
    const revList = document.getElementById("reviews-list");
    revList.innerHTML = "";
    if (appData.reviews.length === 0) {
        revList.innerHTML = "<p style='color: var(--text-secondary);'>No reviews yet.</p>";
    }
    appData.reviews.forEach(rev => {
        const roleStr = rev.role ? ` - ${rev.role}` : '';
        revList.innerHTML += `
            <div class="review-card">
                <h4>${rev.name}${roleStr} <span class="date">${rev.date}</span></h4>
                <p>"${rev.text}"</p>
                ${isAdmin ? `<button class="btn-icon delete-btn" style="margin-top: 10px;" onclick="deleteReview(${rev.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
        `;
    });
}

// --- Editing Logic ---
function setupEditables() {
    const editables = document.querySelectorAll(".editable[data-key]");
    editables.forEach(el => {
        el.addEventListener("click", function(e) {
            if (!isAdmin) return;
            // Prevent multiple inputs
            if (this.querySelector('input') || this.querySelector('textarea')) return;

            const key = this.getAttribute("data-key");
            const isMultiline = this.getAttribute("data-multiline") === "true";
            const currentValue = appData.profile[key];
            
            const input = document.createElement(isMultiline ? "textarea" : "input");
            input.className = "inline-editor";
            input.value = currentValue;
            if (isMultiline) input.rows = 4;
            
            this.innerHTML = "";
            this.appendChild(input);
            input.focus();

            input.addEventListener("blur", () => {
                appData.profile[key] = input.value;
                saveData();
            });

            input.addEventListener("keydown", (evt) => {
                if (evt.key === "Enter" && !isMultiline) {
                    input.blur();
                }
            });
        });
    });
}

function editListText(event, category, id, field) {
    if (!isAdmin) return;
    
    const target = event.currentTarget;
    if (target.querySelector('input') || target.querySelector('textarea')) return;

    const item = appData[category].find(x => x.id === id);
    if (!item) return;

    const currentValue = item[field];
    const isMultiline = field === 'desc';
    
    const input = document.createElement(isMultiline ? "textarea" : "input");
    input.className = "inline-editor";
    input.value = currentValue;
    if (isMultiline) input.rows = 3;
    
    // Save original HTML in case we need it, though renderAll overrides it
    target.innerHTML = "";
    target.appendChild(input);
    input.focus();
    
    // Prevent event bubbling if clicking link icon
    event.stopPropagation();

    input.addEventListener("blur", () => {
        item[field] = input.value;
        saveData();
    });

    input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" && !isMultiline) {
            input.blur();
        }
    });
}

// --- Add / Delete Items ---
function addExperience() {
    if (!isAdmin) return;
    appData.experience.push({
        id: Date.now(),
        title: "New Role",
        company: "Company Name",
        duration: "Year - Year",
        desc: "Description of your responsibilities."
    });
    saveData();
}

function deleteExperience(id) {
    if (!isAdmin) return;
    appData.experience = appData.experience.filter(x => x.id !== id);
    saveData();
}

function addProject() {
    if (!isAdmin) return;
    appData.projects.push({
        id: Date.now(),
        title: "New Project",
        tags: "Tech 1, Tech 2",
        desc: "Short description of the project.",
        link: "#"
    });
    saveData();
}

function deleteProject(id) {
    if (!isAdmin) return;
    appData.projects = appData.projects.filter(x => x.id !== id);
    saveData();
}

// --- Image Upload ---
function triggerImageUpload() {
    if (!isAdmin) return;
    document.getElementById("imageUploader").click();
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            appData.profile.avatar = e.target.result;
            saveData();
        }
        reader.readAsDataURL(file);
    }
}

// --- Viewer Reviews ---
function submitReview(event) {
    event.preventDefault();
    const name = document.getElementById("reviewerName").value;
    const role = document.getElementById("reviewerRole") ? document.getElementById("reviewerRole").value : "";
    const text = document.getElementById("reviewText").value;
    const date = new Date().toISOString().split('T')[0];
    
    appData.reviews.push({
        id: Date.now(),
        name,
        role,
        text,
        date
    });
    
    document.getElementById("reviewForm").reset();
    saveData();
    alert("Thank you for your review!");
}

function deleteReview(id) {
    if (!isAdmin) return;
    appData.reviews = appData.reviews.filter(x => x.id !== id);
    saveData();
}

// Sidebar Active State on Scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// --- Dynamic Sections Logic ---
function addNewSection() {
    if (!isAdmin) return;
    const title = prompt("Enter the name for the new section (e.g., Education, Certifications):");
    if (!title) return;
    appData.customSections.push({
        id: Date.now(),
        title: title,
        items: []
    });
    saveData();
    // Scroll to the new section
    setTimeout(() => {
        window.location.hash = `#sec-${appData.customSections[appData.customSections.length - 1].id}`;
    }, 100);
}

function deleteSection(id) {
    if (!isAdmin) return;
    if (confirm("Are you sure you want to delete this entire section?")) {
        appData.customSections = appData.customSections.filter(x => x.id !== id);
        saveData();
    }
}

function addCustomItem(sectionId) {
    if (!isAdmin) return;
    const sec = appData.customSections.find(x => x.id === sectionId);
    if (!sec) return;
    sec.items.push({
        id: Date.now(),
        title: "New Item Title",
        subtitle: "Subtitle / Location",
        date: "Year",
        desc: "Item description goes here."
    });
    saveData();
}

function deleteCustomItem(sectionId, itemId) {
    if (!isAdmin) return;
    const sec = appData.customSections.find(x => x.id === sectionId);
    if (!sec) return;
    sec.items = sec.items.filter(x => x.id !== itemId);
    saveData();
}

function editSectionTitle(event, sectionId) {
    if (!isAdmin) return;
    const target = event.currentTarget;
    if (target.querySelector('input')) return;

    const sec = appData.customSections.find(x => x.id === sectionId);
    if (!sec) return;

    const input = document.createElement("input");
    input.className = "inline-editor";
    input.value = sec.title;
    
    target.innerHTML = "";
    target.appendChild(input);
    input.focus();
    event.stopPropagation();

    input.addEventListener("blur", () => {
        sec.title = input.value;
        saveData();
    });
    input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") input.blur();
    });
}

function editCustomItemText(event, sectionId, itemId, field) {
    if (!isAdmin) return;
    const target = event.currentTarget;
    if (target.querySelector('input') || target.querySelector('textarea')) return;

    const sec = appData.customSections.find(x => x.id === sectionId);
    if (!sec) return;
    const item = sec.items.find(x => x.id === itemId);
    if (!item) return;

    const isMultiline = field === 'desc';
    const input = document.createElement(isMultiline ? "textarea" : "input");
    input.className = "inline-editor";
    input.value = item[field];
    if (isMultiline) input.rows = 3;
    
    target.innerHTML = "";
    target.appendChild(input);
    input.focus();
    event.stopPropagation();

    input.addEventListener("blur", () => {
        item[field] = input.value;
        saveData();
    });
    input.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter" && !isMultiline) input.blur();
    });
}
