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
    const roofRail=document.createElement("div");
    Object.assign(roofRail.style,railStyle,{left:"0",top:"0",width:"100%",height:"24px"});
    arenaVisual.append(roofRail);
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
      roofRail.style.height="28px";
      roofRail.style.border="4px solid #fff";
      roofRail.style.boxShadow="0 5px 0 #111, 0 0 18px #00eaff";
      roofRail.style.top="60px";
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
      arenaVisual.style.display = "none";
      arenaBounds = null;
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
        physics.elasticity = frenzy ? 1.85 : original.elasticity;
        physics.linearDamping = frenzy ? 0 : original.linearDamping;
      }
      const body = runtime.objects.body?.getFirstInstance();
      if (body?.behaviors?.Physics) {
        const world = body.behaviors.Physics.behavior;
        if (oldGravity === null) oldGravity = world.worldGravity;
        world.worldGravity = frenzy ? 7 : oldGravity;
      }
      // Frenzy is selected before the original game start flow, so no mid-round restart is needed.
    }

    button.style.display = "none";
    arenaVisual.style.display = "none";

    // Pre-game selector: choose player count and Frenzy before opening the existing game menu.
    const pregame = document.createElement("div");
    Object.assign(pregame.style, {
      position:"fixed", inset:"0", zIndex:"2147483647", display:"flex",
      alignItems:"center", justifyContent:"center", background:"#000b",
      fontFamily:"Arial,sans-serif", color:"#fff"
    });
    const panel = document.createElement("div");
    Object.assign(panel.style,{background:"#171717",border:"3px solid #fff",borderRadius:"16px",padding:"26px",width:"min(420px,90vw)",textAlign:"center",boxShadow:"0 8px 35px #000"});
    const heading=document.createElement("div");
    heading.textContent="BASKET RANDOM";
    Object.assign(heading.style,{fontSize:"26px",fontWeight:"900",marginBottom:"20px"});
    const playerRow=document.createElement("div");
    Object.assign(playerRow.style,{display:"flex",gap:"12px",marginBottom:"18px"});
    let playerCount=2;
    function choice(label,selected) {
      const b=document.createElement("button"); b.type="button"; b.textContent=label;
      Object.assign(b.style,{flex:"1",padding:"15px 8px",fontSize:"18px",fontWeight:"900",border:"2px solid #fff",borderRadius:"8px",background:selected?"#087db5":"#333",color:"#fff",cursor:"pointer"});
      return b;
    }
    const one=choice("1 PLAYER",false), two=choice("2 PLAYERS",true);
    function updatePlayerChoice() {
      one.style.background=playerCount===1?"#087db5":"#333";
      two.style.background=playerCount===2?"#087db5":"#333";
    }
    one.addEventListener("click",()=>{playerCount=1;updatePlayerChoice();});
    two.addEventListener("click",()=>{playerCount=2;updatePlayerChoice();});
    playerRow.append(one,two);
    const frenzyChoice=choice("FRENZY: OFF",false);
    let selectedFrenzy=false;
    frenzyChoice.style.width="100%";
    frenzyChoice.style.marginBottom="18px";
    frenzyChoice.addEventListener("click",()=>{selectedFrenzy=!selectedFrenzy;frenzyChoice.textContent="FRENZY: "+(selectedFrenzy?"ON":"OFF");frenzyChoice.style.background=selectedFrenzy?"#b00020":"#333";});
    const play=choice("START GAME",true);
    play.style.width="100%";
    play.addEventListener("click",()=>{
      runtime.globalVars.CPU = playerCount===1;
      setFrenzy(selectedFrenzy);
      button.style.display="block";
      pregame.remove();
    });
    panel.append(heading,playerRow,frenzyChoice,play);
    pregame.append(panel);
    document.body.append(pregame);

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
    let escapeResetPending = false;
    let arenaBounds = null;

    let lastP1Score = Number(runtime.globalVars.p1Score) || 0;
    let lastP2Score = Number(runtime.globalVars.p2Score) || 0;
    runtime.addEventListener("tick", () => {
      if (frenzy) {
        // Re-apply Frenzy settings to newly created balls and keep extra players hidden.
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
          physics.elasticity = 2.2;
          physics.linearDamping = 0;
        }
      }
      const now = performance.now();
      if (now - lastBallFlash >= 130) {
        lastBallFlash = now;
        ballFlashIndex = (ballFlashIndex + 1) % ballFlashColors.length;
      }
      const ballTypes = ["balls","normalBall","kamesBall","heavyBall","smallBall"];
      for (const name of ballTypes) {
        for (const ball of runtime.objects[name]?.getAllInstances() || []) {
          ball.colorRgb = frenzy ? ballFlashColors[ballFlashIndex] : [1,1,1];
        }
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

      // Frenzy enclosure is anchored to the actual hoop collision objects.
      // The hoop positions define the two vertical side walls; the roof joins them.
      const hoopParts = runtime.objects.potaCollision?.getAllInstances() || [];
      if (width && height && hoopParts.length >= 2) {
        const hoopXs = hoopParts.map(h => h.x).sort((a,b) => a-b);
        const leftWall = hoopXs[0] + Math.max(2, (hoopParts[0].width || 8) * 0.5);
        const rightWall = hoopXs[hoopXs.length-1] - Math.max(2, (hoopParts[hoopParts.length-1].width || 8) * 0.5);
        arenaBounds = {left:leftWall, right:rightWall, roof:2, floor:height-3};
      } else if (width && height) {
        arenaBounds = {left:8, right:width-8, roof:2, floor:height-3};
      }

      for (const ball of ["balls","normalBall","kamesBall","heavyBall","smallBall"].flatMap(name => runtime.objects[name]?.getAllInstances() || [])) {
        const physics = ball.behaviors?.Physics;
        if (!physics || !arenaBounds) continue;
        const radius = Math.max(3, Math.min(ball.width || 10, ball.height || 10) * 0.45);
        const left = arenaBounds.left + radius;
        const right = arenaBounds.right - radius;
        const top = arenaBounds.roof + radius;
        const bottom = arenaBounds.floor - radius;
        let x=ball.x, y=ball.y;
        const v=physics.getVelocity();
        let vx=v[0], vy=v[1];
        if (x < left) { x=left; vx=Math.abs(vx)*1.08; }
        else if (x > right) { x=right; vx=-Math.abs(vx)*1.08; }
        if (y < top) { y=top; vy=Math.abs(vy)*1.08; }
        else if (y > bottom) { y=bottom; vy=-Math.abs(vy)*1.08; }
        if (x!==ball.x || y!==ball.y) physics.teleport(x,y);
        if (vx!==v[0] || vy!==v[1]) physics.setVelocity(vx,vy);
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