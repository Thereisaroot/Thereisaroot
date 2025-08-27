document.addEventListener('DOMContentLoaded', () => {
    const portalContainer = document.querySelector('.portal-container');
    const iframeContainer = document.getElementById('iframe-container');
    const contentFrame = document.getElementById('content-frame');
    const backButton = document.getElementById('back-button');
    const portalCards = document.querySelectorAll('.portal-card');
    const navButtons = document.querySelectorAll('.nav-button');

    const setActiveButton = (url) => {
        navButtons.forEach(button => {
            if (button.getAttribute('data-src') === url) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    };

    const openIframe = (url) => {
        contentFrame.src = url;
        setActiveButton(url);
        portalContainer.classList.add('hidden');
        iframeContainer.classList.remove('hidden');
    };

    portalCards.forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-src');
            if (url) {
                openIframe(url);
            }
        });
    });

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const url = button.getAttribute('data-src');
            if (url && contentFrame.src !== url) {
                contentFrame.src = url;
                setActiveButton(url);
            }
        });
    });

    backButton.addEventListener('click', () => {
        contentFrame.src = 'about:blank';
        portalContainer.classList.remove('hidden');
        iframeContainer.classList.add('hidden');
    });
});
