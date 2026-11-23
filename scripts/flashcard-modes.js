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
      if (frenzy) {
        for (const name of hiddenNames) setVisible(name, false);
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
        if (arm) arm.angle = arm.angle - 0.9;
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