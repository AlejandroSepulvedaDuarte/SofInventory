const animatedElements = document.querySelectorAll('.fade-up');

    const footerObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.2 });

    animatedElements.forEach(el => footerObserver.observe(el));