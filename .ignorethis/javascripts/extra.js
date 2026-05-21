function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
    }, (err) => {
        console.error('Failed to copy to clipboard', err);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    /* Starfield effect should run only on landing page (where #space canvas is present) */
    const canvas = document.getElementById('space');
    // If the page doesn't include the canvas, skip starfield + related hover logic
    if (!canvas) {
        return;
    }
    // Ensure proper styling for existing canvas
    Object.assign(canvas.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        // zIndex: 0,
        pointerEvents: 'none'
    });

    const ctx = canvas.getContext('2d');
    const numStars = 1500;
    let stars = [];
    // viewport dimensions
    let w = window.innerWidth;
    let h = window.innerHeight;
    // focal length controls perspective
    let focal = w * 2;
    let centerX = w / 2;
    let centerY = h / 2;
    canvas.width = w;
    canvas.height = h;

    // warp variables
    let warpTarget = 0;  // 0-idle, 1-full warp
    let warpSpeed = 0;

    // init star array
    const initStars = () => {
        stars = [];
        for (let i = 0; i < numStars; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                z: Math.random() * w,
                o: 0.4 + Math.random() * 0.6
            });
        }
    };
    initStars();

    const resize = () => {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
        centerX = w / 2;
        centerY = h / 2;
        focal = w * 2;
        initStars();
    };
    window.addEventListener('resize', resize);

    const animate = () => {
        requestAnimationFrame(animate);

        // ease warpSpeed toward warpTarget
        warpSpeed += (warpTarget - warpSpeed) * 0.05;

        // based trail length on warpSpeed
        const trail = 2 + warpSpeed * 25;

        ctx.fillStyle = `rgba(17,17,17,${1 - warpSpeed * 0.8})`;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            // move star forward (toward viewer)
            s.z -= 1 + warpSpeed * 50;
            if (s.z <= 0) {
                s.z = w;
                s.x = Math.random() * w;
                s.y = Math.random() * h;
            }
            // screen position
            const k = focal / s.z;
            const px = (s.x - centerX) * k + centerX;
            const py = (s.y - centerY) * k + centerY;

            // draw trail
            ctx.strokeStyle = `rgba(209,255,255,${s.o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + (px - centerX) * trail / focal, py + (py - centerY) * trail / focal);
            ctx.stroke();

            // draw star (small rect)
            ctx.fillStyle = `rgba(209,255,255,${s.o})`;
            ctx.fillRect(px, py, 1, 1);
        }
    };
    animate();

    // Intensify warp when hovering Quick-Install block
    const qi = document.getElementById('quickInstall');
    if (qi) {
        qi.addEventListener('mouseenter', () => { warpTarget = 1; });
        qi.addEventListener('mouseleave', () => { warpTarget = 0; });
    }

    /* ===================== DOT GRID INTERACTIVE DECORATION ===================== */
    const dotGrid = document.getElementById('dotGrid');
    if (dotGrid) {
        const buildGrid = () => {
            const width = window.innerWidth;
            const height = dotGrid.offsetHeight;
            const spacing = 20;
            const cols = Math.ceil(width / spacing);
            const rows = Math.ceil(height / spacing);
            dotGrid.innerHTML = '';
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const d = document.createElement('div');
                    d.className = 'dot';
                    d.textContent = '✦';
                    d.style.left = `${x * spacing}px`;
                    d.style.top = `${y * spacing}px`;
                    dotGrid.appendChild(d);
                }
            }
        };
        buildGrid();
        window.addEventListener('resize', buildGrid);

        // reactive hover effect
        dotGrid.addEventListener('mousemove', (e) => {
            const rect = dotGrid.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            document.querySelectorAll('#dotGrid .dot').forEach(dot => {
                const dx = mx - parseFloat(dot.style.left);
                const dy = my - parseFloat(dot.style.top);
                const dist = Math.hypot(dx, dy);
                const max = 120;
                if (dist < max) {
                    const intensity = 1 - dist / max;
                    dot.style.color = `rgba(255,255,255,${0.3 + intensity})`;
                    const move = intensity * 10;
                    dot.style.transform = `translate(${dx/dist*move}px, ${dy/dist*move}px) scale(${1 + intensity * 1.2})`;
                } else {
                    dot.style.color = '#444';
                    dot.style.transform = 'translate(0,0) scale(1)';
                }
            });
        });
        dotGrid.addEventListener('mouseleave', () => {
            document.querySelectorAll('#dotGrid .dot').forEach(dot => {
                dot.style.color = '#444';
                dot.style.transform = 'none';
            });
        });
    }
});
