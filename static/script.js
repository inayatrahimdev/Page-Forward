/**
 * PageForward - Main JavaScript File
 * Handles all client-side functionality including animations, form submissions, validations
 * and responsive behavior.
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the UI components
    initNavbar();
    initScrollEffects();
    initForms();
    initModal();
    initFileUpload();
    createParticles();
});

/**
 * Navigation bar functionality (mobile menu toggle, scroll effects)
 */
function initNavbar() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    // Toggle mobile menu
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Close mobile menu when clicking a link
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Highlight active nav item based on scroll position
    window.addEventListener('scroll', () => {
        let current = '';
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.scrollY;

        // Navbar background change on scroll
        const navbar = document.querySelector('.navbar');
        if (scrollPosition > 100) {
            navbar.style.padding = '0.8rem 0';
            navbar.style.boxShadow = 'var(--shadow-lg)';
        } else {
            navbar.style.padding = '1rem 0';
            navbar.style.boxShadow = 'var(--shadow-md)';
        }

        // Determine which section is in view
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        // Update active nav item
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });
}

/**
 * Scroll animations and effects
 */
function initScrollEffects() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Account for navbar height
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add animation on scroll for elements
    const animateElements = document.querySelectorAll('.mission-card, .donation-card, .team-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    animateElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

/**
 * Form handling (validation and submission via AJAX)
 */
function initForms() {
    // Book Donation Form
    const bookDonationForm = document.getElementById('book-donation-form');
    if (bookDonationForm) {
        bookDonationForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (validateForm(this)) {
                const formData = new FormData(this);

                fetch('/donate_book', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            showModal('Thank You!', data.message);
                            this.reset();
                        } else {
                            showModal('Error', data.message);
                        }
                    })
                    .catch(error => {
                        showModal('Error', 'There was a problem submitting your donation. Please try again.');
                        console.error('Error:', error);
                    });
            }
        });
    }

    // Volunteer Application Form
    const volunteerForm = document.getElementById('volunteer-form');
    if (volunteerForm) {
        volunteerForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (validateForm(this)) {
                const formData = new FormData(this);

                fetch('/apply_volunteer', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            showModal('Application Received!', data.message);
                            this.reset();
                            document.querySelector('.file-info').textContent = 'No file selected';
                        } else {
                            showModal('Error', data.message);
                        }
                    })
                    .catch(error => {
                        showModal('Error', 'There was a problem submitting your application. Please try again.');
                        console.error('Error:', error);
                    });
            }
        });
    }

    // Contact Form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            if (validateForm(this)) {
                const formData = new FormData(this);

                fetch('/contact', {
                    method: 'POST',
                    body: formData
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            showModal('Message Sent!', data.message);
                            this.reset();
                        } else {
                            showModal('Error', data.message);
                        }
                    })
                    .catch(error => {
                        showModal('Error', 'There was a problem sending your message. Please try again.');
                        console.error('Error:', error);
                    });
            }
        });
    }
}

/**
 * Form validation
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} Whether the form is valid
 */
function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

    inputs.forEach(input => {
        const errorMessage = input.nextElementSibling;
        if (input.value.trim() === '') {
            isValid = false;
            input.classList.add('error');
            if (errorMessage) {
                errorMessage.textContent = `${input.name} is required.`;
                errorMessage.style.display = 'block';
            }
        } else {
            input.classList.remove('error');
            if (errorMessage) {
                errorMessage.textContent = '';
                errorMessage.style.display = 'none';
            }
        }

        // Additional validation for email
        if (input.type === 'email' && input.value.trim() !== '') {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(input.value)) {
                isValid = false;
                input.classList.add('error');
                if (errorMessage) {
                    errorMessage.textContent = 'Please enter a valid email address.';
                    errorMessage.style.display = 'block';
                }
            }
        }
    });

    return isValid;
}

/**
 * Modal functionality for feedback messages
 */
function initModal() {
    const modal = document.getElementById('modal');
    const closeModalButtons = modal.querySelectorAll('.close-modal, .close-btn');

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function showModal(title, message) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.style.display = 'block';
}

/**
 * File upload functionality for volunteer form
 */
function initFileUpload() {
    const fileInput = document.getElementById('resume');
    const fileInfo = document.querySelector('.file-info');

    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                fileInfo.textContent = fileName;
            } else {
                fileInfo.textContent = 'No file selected';
            }
        });
    }
}

/**
 * Particle effect for hero section
 */
function createParticles() {
    const particlesContainer = document.querySelector('.particles');
    if (particlesContainer) {
        // Example particle effect logic
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            particle.style.animationDuration = `${Math.random() * 5 + 2}s`;
            particlesContainer.appendChild(particle);
        }
    }
}