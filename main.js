/* global replicad */
/** @typedef { typeof import("replicad") } replicad */

const fuseAll = (d) => {
  let out = d[0];
  d.slice(1).forEach((s) => {
    out = s.fuse(out);
  });
  return out;
};

const range = (n) => [...Array(n).keys()];

export function makeSideHinge(
  height,
  width,
  { hingeRadius = null, tolerance = 0.4, nCouples = 2, backTolerance = 0.4 }
) {
  const { draw, drawRoundedRectangle, drawCircle, makePlane } = replicad;
  const radius = Math.min(height / 2, hingeRadius || height);

  const nElements = nCouples * 2;
  const nCuts = nElements - 1;

  const supportWidth = (width - tolerance * nCuts) / nElements;

  const x0 = radius + radius / Math.sqrt(2);
  const y0 = radius / Math.sqrt(2);

  const rest = height / 2 - y0;

  const hingeSupport = () => {
    const slopeLength = Math.min(rest, x0);

    let support = draw()
      .movePointerTo([radius, height / 2])
      .hLine(-radius)
      .polarLine(radius, -135)
      .line(slopeLength, -slopeLength);

    if (slopeLength < x0) support = support.hLine(x0 - slopeLength);

    const pillarChamfer = Math.min(radius / 2, height / 4);
    let pillar = draw().hLine(radius);
    if (backTolerance) pillar = pillar.line(backTolerance, -backTolerance);
    pillar = pillar
      .vLine(-height / 2 + backTolerance)
      .hLine(pillarChamfer - radius - backTolerance)
      .line(-pillarChamfer, pillarChamfer)
      .close()
      .translate(0, height / 2);

    return support
      .close()
      .fuse(pillar)
      .cut(drawCircle(radius - tolerance).translate(0, height / 2))
      .sketchOnPlane("YZ", +tolerance / 2)
      .extrude(supportWidth);
  };

  const spacer = () =>
    draw()
      .movePointerTo([-tolerance / 2, radius])
      .vLine(-radius / 3)
      .line(-radius / 3, -radius / 3)
      .vLine(-radius / 3)
      .hLine(tolerance)
      .vLine(radius / 3)
      .line(radius / 3, radius / 3)
      .vLine(radius / 3)
      .close();

  let base = drawRoundedRectangle(width, radius).translate(0, radius / 2);

  base = base.cut(spacer());
  for (let i = 1; i < nCouples; i++) {
    base = base
      .cut(spacer().translate(i * (supportWidth + tolerance), 0))
      .cut(spacer().translate(-i * (supportWidth + tolerance), 0));
  }

  const translationStep = supportWidth + tolerance;

  const support = hingeSupport().translateX(-translationStep * (nCouples - 1));

  const mirrorSupport = support
    .clone()
    .mirror(makePlane("XZ"))
    .translateX(-translationStep);

  let hinge = base
    .sketchOnPlane("XY")
    .revolve([1, 0, 0])
    .translateZ(height / 2)
    .fuse(support)
    .fuse(mirrorSupport);

  for (let i = 1; i < nCouples; i++) {
    hinge = hinge
      .fuse(support.clone().translateX(2 * translationStep * i))
      .fuse(mirrorSupport.clone().translateX(2 * translationStep * i));
  }

  return {
    hinge: hinge,
    hingeWidth: radius + backTolerance,
  };
}

export function makeFlatHinge(
  height,
  width,
  baseHeight,
  tolerance = 0.4,
  nCouples = 2
) {
  const radius = height / 2;
  const { draw, drawRoundedRectangle } = replicad;

  const nElements = nCouples * 2;
  const nCuts = nElements - 1;

  const flapWidth = (width - tolerance * nCuts) / nElements;

  const spacer = () =>
    draw()
      .movePointerTo([-tolerance / 2, radius])
      .vLine(-radius / 3)
      .line(-radius / 3, -radius / 3)
      .vLine(-radius / 3)
      .hLine(tolerance)
      .vLine(radius / 3)
      .line(radius / 3, radius / 3)
      .vLine(radius / 3)
      .close();

  let base = drawRoundedRectangle(width, radius).translate(0, radius / 2);
  base = base.cut(spacer());
  for (let i = 1; i < nCouples; i++) {
    base = base
      .cut(spacer().translate(i * (flapWidth + tolerance), 0))
      .cut(spacer().translate(-i * (flapWidth + tolerance), 0));
  }

  const flapLength = radius + tolerance;
  const translationStep = flapWidth + tolerance;

  const flap = drawRoundedRectangle(flapWidth, flapLength).translate(
    -translationStep * (nCouples - 1.5),
    flapLength / 2
  );
  const mirrorFlap = drawRoundedRectangle(flapWidth, flapLength).translate(
    -translationStep * (nCouples - 0.5),
    -flapLength / 2
  );

  const fullCylinder = drawRoundedRectangle(width, radius)
    .translate(0, radius / 2)
    .sketchOnPlane()
    .revolve([1, 0, 0])
    .translateZ(radius);

  const flaps = fuseAll([
    flap,
    mirrorFlap,
    ...range(nCouples - 1).flatMap((n) => {
      const translation = 2 * (n + 1) * translationStep;
      return [
        flap.clone().translate(translation, 0),
        mirrorFlap.translate(translation, 0),
      ];
    }),
  ])
    .sketchOnPlane()
    .extrude(baseHeight)
    .cut(fullCylinder);
  const hinge = base.sketchOnPlane("XY").revolve([1, 0, 0]).translateZ(radius);

  return {
    hinge: hinge.fuse(flaps).chamfer(0.12, (e) =>
      e
        .inDirection("X")
        .inPlane("XY", baseHeight)
        .not((e) => e.inPlane("XZ", flapLength))
        .not((e) => e.inPlane("ZX", flapLength))
    ),
    hingeWidth: flapLength,
  };
}

export default function main() {
  const sideHinge = makeSideHinge(60, 20, { hingeRadius: 6 });
  return [
    {
      shape: sideHinge.hinge.translateX(15),
      name: "Side hinge",
    },
    {
      shape: makeFlatHinge(12, 20, 2).hinge.translateX(-15),
      name: "Flat hinge",
    },
  ];
}
