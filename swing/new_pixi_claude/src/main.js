// Main entry point
let app;
let game;
let gameData;

window.addEventListener('DOMContentLoaded', async () => {
    // Initialize Pixi application
    app = new PIXI.Application({
        width: CONFIG.width,
        height: CONFIG.height,
        backgroundColor: CONFIG.backgroundColor,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
    });
    
    // Add canvas to container
    document.getElementById('game-container').appendChild(app.view);
    
    // Initialize game data
    gameData = new GameData();
    
    // Initialize game
    game = new Game(app, gameData);
    
    // Start game
    await game.init();
    
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Handle resize
    window.addEventListener('resize', () => {
        const parent = app.view.parentElement;
        const ratio = CONFIG.width / CONFIG.height;
        
        let width = parent.clientWidth;
        let height = parent.clientHeight;
        
        if (width / height > ratio) {
            width = height * ratio;
        } else {
            height = width / ratio;
        }
        
        app.renderer.resize(width, height);
        app.stage.scale.set(width / CONFIG.width, height / CONFIG.height);
    });
    
    // Trigger initial resize
    window.dispatchEvent(new Event('resize'));
});