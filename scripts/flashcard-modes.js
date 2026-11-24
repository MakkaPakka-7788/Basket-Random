(() => {
"use strict";
runOnStartup(runtime => {
  runtime.addEventListener("beforeprojectstart", () => {
    let frenzy = false;
    const hiddenNames = ["body3","head3","arm3","handCollision3","p3Collision","body4","head4","arm4","handCollision4","p4Collision"];
    const savedVisibility = new Map();
    const ballDefaults = new Map();
    let oldGravity = null;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "FRENZY: OFF";
    button.setAttribute("aria-label", "Toggle Frenzy mode");
    Object.assign(button.style, {
      position:"fixed", zIndex:"999999", right:"12px", top:"12px",
      padding:"10px 14px", border:"2px solid #fff", borderRadius:"8px",
      background:"#111", color:"#fff", font:"bold 14px Arial",
      cursor:"pointer", boxShadow:"0 2px 10px #0008"
    });
    document.body.appendChild(button);

    // Visible Frenzy arena rails, aligned to the actual game canvas.
    const arenaVisual = document.createElement("div");
    Object.assign(arenaVisual.style, {
      position:"fixed", zIndex:"2147483646", pointerEvents:"none",
      display:"none", boxSizing:"border-box"
    });
    const railStyle = {
      position:"absolute", background:"repeating-linear-gradient(90deg,#ff3030 0 34px,#ffe600 34px 68px,#20d94b 68px 102px,#2585ff 102px 136px)",
      border:"3px solid #ffffff", borderRadius:"4px",
      boxShadow:"0 0 14px #00cfff, 0 0 5px #000, inset 0 0 5px #fff"
    };
    const leftRail=document.createElement("div");
    const rightRail=document.createElement("div");
    const roofRail=document.createElement("div");
    for (const rail of [leftRail,rightRail,roofRail]) Object.assign(rail.style,railStyle);
    Object.assign(leftRail.style,{left:"0",top:"0",width:"14px",height:"100%"});
    Object.assign(rightRail.style,{right:"0",top:"0",width:"10px",height:"100%"});
    Object.assign(roofRail.style,{left:"0",top:"0",width:"100%",height:"18px"});
    arenaVisual.append(leftRail,rightRail,roofRail);
    document.body.appendChild(arenaVisual);

    function positionArenaVisual() {
      if (!frenzy) {
        arenaVisual.style.display="none";
        return;
      }
      const canvases = Array.from(document.querySelectorAll("canvas"));
      const canvas = canvases
        .map(el => ({el, rect:el.getBoundingClientRect()}))
        .filter(x => x.rect.width > 100 && x.rect.height > 100)
        .sort((a,b) => (b.rect.width*b.rect.height)-(a.rect.width*a.rect.height))[0]?.el;
      const rect = {left:0, top:0, width:window.innerWidth, height:window.innerHeight};
      arenaVisual.style.display="block";
      arenaVisual.style.left=rect.left+"px";
      arenaVisual.style.top=rect.top+"px";
      arenaVisual.style.width=rect.width+"px";
      arenaVisual.style.height=rect.height+"px";
      // Keep the roof in front of the game canvas and visibly span the whole arena.
      roofRail.style.display="block";
      roofRail.style.height="42px";
      roofRail.style.border="5px solid #fff";
      roofRail.style.boxShadow="0 5px 0 #111, 0 0 28px #00eaff";
      roofRail.style.top="58px";
      roofRail.style.zIndex="2147483647";
      roofRail.style.background="repeating-linear-gradient(90deg,#ff3030 0 34px,#ffe600 34px 68px,#20d94b 68px 102px,#2585ff 102px 136px)";
    }

    function setVisible(name, visible) {
      const cls = runtime.objects[name];
      if (!cls) return;
      for (const inst of cls.getAllInstances()) {
        if (!savedVisibility.has(inst)) savedVisibility.set(inst, inst.isVisible);
        inst.isVisible = visible;
      }
    }

    function setFrenzy(enabled) {
      frenzy = enabled;
      button.textContent = frenzy ? "FRENZY: ON" : "FRENZY: OFF";
      button.style.background = frenzy ? "#b00020" : "#111";
      positionArenaVisual();
      if (frenzy) {
        for (const name of hiddenNames) {
          const cls = runtime.objects[name];
          if (cls) for (const inst of cls.getAllInstances()) inst.isVisible = false;
        }
      } else {
        for (const [inst, visible] of savedVisibility) inst.isVisible = visible;
        savedVisibility.clear();
      }
      const balls = runtime.objects.balls?.getAllInstances() || [];
      for (const ball of balls) {
        const physics = ball.behaviors?.Physics;
        if (!physics) continue;
        if (!ballDefaults.has(ball)) ballDefaults.set(ball, {
          elasticity: physics.elasticity,
          linearDamping: physics.linearDamping
        });
        const original = ballDefaults.get(ball);
        physics.elasticity = frenzy ? 1.25 : original.elasticity;
        physics.linearDamping = frenzy ? 0 : original.linearDamping;
      }
      const body = runtime.objects.body?.getFirstInstance();
      if (body?.behaviors?.Physics) {
        const world = body.behaviors.Physics.behavior;
        if (oldGravity === null) oldGravity = world.worldGravity;
        world.worldGravity = frenzy ? 7 : oldGravity;
      }
      // Restart the current Construct layout when Frenzy is switched on.
      if (frenzy && typeof runtime.goToLayout === "function" && runtime.layout?.name) {
        runtime.goToLayout(runtime.layout.name);
      }
    }

    button.addEventListener("click", () => setFrenzy(!frenzy));

    function tryDunk() {
      const hands = ["handCollision","handCollision2","handCollision3","handCollision4"]
        .flatMap(name => runtime.objects[name]?.getAllInstances() || []);
      const rims = runtime.objects.potaCollision?.getAllInstances() || [];
      const targets = runtime.objects.scoreCollision?.getAllInstances() || [];
      const balls = runtime.objects.balls?.getAllInstances() || [];
      for (const hand of hands) {
        const rim = rims.find(r => runtime.collisions.testOverlap(hand, r));
        if (!rim) continue;
        const target = targets.find(t => t.instVars.which === rim.instVars.which);
        if (!target) continue;
        const ball = balls.find(b => !!b.instVars.hold);
        if (!ball) continue;
        const armName = hand === (runtime.objects.handCollision?.getFirstInstance()) ? "arm" :
          hand === (runtime.objects.handCollision2?.getFirstInstance()) ? "arm2" :
          hand === (runtime.objects.handCollision3?.getFirstInstance()) ? "arm3" : "arm4";
        const arm = runtime.objects[armName]?.getFirstInstance();
        if (arm) {
          const startAngle = arm.angle;
          const started = performance.now();
          const animateArm = now => {
            const progress = Math.min(1, (now - started) / 180);
            arm.angle = startAngle - 0.9 * (1 - Math.pow(1 - progress, 3));
            if (progress < 1) requestAnimationFrame(animateArm);
          };
          requestAnimationFrame(animateArm);
        }
        const physics = ball.behaviors?.Physics;
        if (physics) {
          physics.teleport(target.x, target.y);
          physics.setVelocity(0, 0);
        } else {
          ball.x = target.x;
          ball.y = target.y;
        }
        ball.instVars.hold = 0;
        ball.instVars.handCollision = 0;
        return;
      }
    }


    const ballFlashColors = [
      [1, 0.05, 0.05],
      [1, 0.9, 0.02],
      [0.05, 1, 0.12],
      [0.05, 0.25, 1]
    ];
    let ballFlashIndex = 0;
    let lastBallFlash = 0;

    let lastP1Score = Number(runtime.globalVars.p1Score) || 0;
    let lastP2Score = Number(runtime.globalVars.p2Score) || 0;
    runtime.addEventListener("tick", () => {
      if (frenzy) {
        positionArenaVisual();
        // Re-apply Frenzy settings after the layout restart creates fresh instances.
        for (const name of hiddenNames) {
          const cls = runtime.objects[name];
          if (cls) for (const inst of cls.getAllInstances()) inst.isVisible = false;
        }
        for (const ball of runtime.objects.balls?.getAllInstances() || []) {
          const physics = ball.behaviors?.Physics;
          if (!physics) continue;
          if (!ballDefaults.has(ball)) ballDefaults.set(ball, {
            elasticity: physics.elasticity,
            linearDamping: physics.linearDamping
          });
          physics.elasticity = 1.25;
          physics.linearDamping = 0;
        }
      }
      const now = performance.now();
      if (now - lastBallFlash >= 130) {
        lastBallFlash = now;
        ballFlashIndex = (ballFlashIndex + 1) % ballFlashColors.length;
      }
      for (const ball of runtime.objects.balls?.getAllInstances() || []) {
        if (frenzy) ball.colorRgb = ballFlashColors[ballFlashIndex];
        else ball.colorRgb = [1,1,1];
      }
      if (!frenzy) {
        lastP1Score = Number(runtime.globalVars.p1Score) || 0;
        lastP2Score = Number(runtime.globalVars.p2Score) || 0;
        return;
      }
      const p1 = Number(runtime.globalVars.p1Score) || 0;
      const p2 = Number(runtime.globalVars.p2Score) || 0;
      if (p1 > lastP1Score) runtime.globalVars.p1Score = lastP1Score + 5;
      if (p2 > lastP2Score) runtime.globalVars.p2Score = lastP2Score + 5;
      lastP1Score = Number(runtime.globalVars.p1Score) || 0;
      lastP2Score = Number(runtime.globalVars.p2Score) || 0;

      const width = runtime.layout?.width || 0;
      const height = runtime.layout?.height || 0;

      // Invisible Frenzy arena: keep both players and the ball inside the playfield.
      for (const name of ["body", "body2"]) {
        for (const player of runtime.objects[name]?.getAllInstances() || []) {
          const physics = player.behaviors?.Physics;
          if (!physics || !width || !height) continue;
          const velocity = physics.getVelocity();
          const halfW = Math.max(12, (player.width || 40) * 0.38);
          const halfH = Math.max(18, (player.height || 80) * 0.45);
          const left = halfW + 8;
          const right = width - halfW - 8;
          // Solid invisible roof: stop upward movement and push the player back inside.
          const canvasRect = (runtime.canvas || document.querySelector("canvas"))?.getBoundingClientRect();
          const roofWorldY = canvasRect && canvasRect.height
            ? ((58 + 42 - canvasRect.top) / canvasRect.height) * height
            : 100;
          const ceiling = Math.max(halfH + 10, roofWorldY + halfH);
          const floor = height - halfH - 8;
          const x = Math.max(left, Math.min(right, player.x));
          const y = Math.max(ceiling, Math.min(floor, player.y));
          if (x !== player.x || y !== player.y) {
            physics.teleport(x, y);
            physics.setVelocity(
              x !== player.x ? 0 : velocity[0],
              y !== player.y ? Math.max(420, Math.abs(velocity[1]) * 0.65) : velocity[1]
            );
          }
        }
      }

      for (const ball of runtime.objects.balls?.getAllInstances() || []) {
        const physics = ball.behaviors?.Physics;
        if (!physics || !width || !height) continue;
        const velocity = physics.getVelocity();
        const radius = Math.max(10, Math.min(ball.width || 24, ball.height || 24) * 0.45);
        const left = radius + 5;
        const right = width - radius - 5;
        const canvasRect = (runtime.canvas || document.querySelector("canvas"))?.getBoundingClientRect();
        const roofWorldY = canvasRect && canvasRect.height
          ? ((58 + 42 - canvasRect.top) / canvasRect.height) * height
          : 100;
        const ceiling = Math.max(radius + 5, roofWorldY + radius);
        const floor = height - radius - 5;
        let x = ball.x;
        let y = ball.y;
        let vx = velocity[0];
        let vy = velocity[1];
        if (x < left) { x = left; vx = Math.abs(vx) * 0.72; }
        else if (x > right) { x = right; vx = -Math.abs(vx) * 0.72; }
        if (y < ceiling) { y = ceiling; vy = Math.abs(vy) * 0.72; }
        else if (y > floor) { y = floor; vy = -Math.abs(vy) * 0.72; }
        if (x !== ball.x || y !== ball.y) physics.teleport(x, y);
        if (vx !== velocity[0] || vy !== velocity[1]) physics.setVelocity(vx, vy);
      }
    });

    const jumpKeys = new Set(["ArrowUp","w","W","i","I","t","T"]);
    window.addEventListener("keydown", event => {
      if (event.repeat) return;
      if (event.key.toLowerCase() === "d") {
        tryDunk();
        return;
      }
      if (!frenzy || !jumpKeys.has(event.key)) return;
      const bodies = ["body","body2"].flatMap(name => runtime.objects[name]?.getAllInstances() || []);
      for (const body of bodies) {
        const physics = body.behaviors?.Physics;
        if (!physics) continue;
        const velocity = physics.getVelocity();
        physics.setVelocity(velocity[0], -1450);
      }
    });
  });
});
})();