/* global replicad */
/** @typedef { typeof import("replicad") } replicad */

const fuseAll = (d) => {
  let out = d[0];
  d.slice(1).forEach((s) => {
    out = s.fuse(out);
  });
  return out;
};

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

  const hingeSupport = () => {
    const x0 = radius + radius / Math.sqrt(2);
    const y0 = radius / Math.sqrt(2);

    const rest = height / 2 - y0;

    const slopeLength = Math.min(rest, x0);

    let support = draw()
      .movePointerTo([radius, height / 2])
      .hLine(-radius)
      .polarLine(radius, -135)
      .line(slopeLength, -slopeLength);

    if (slopeLength < x0) support = support.hLine(x0 - slopeLength);

    let pillar = draw().hLine(radius);
    if (backTolerance) pillar = pillar.line(backTolerance, -backTolerance);
    pillar = pillar
      .vLine(-height / 2 + backTolerance)
      .hLine(-radius - backTolerance)
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

  const support = hingeSupport();
  const mirrorSupport = support
    .clone()
    .mirror(makePlane("XZ"))
    .translateX(-supportWidth - tolerance);

  let hinge = base
    .sketchOnPlane("XY")
    .revolve([1, 0, 0])
    .translateZ(height / 2)
    .fuse(support)
    .fuse(mirrorSupport);

  const translationStep = supportWidth + tolerance;
  for (let i = 1; i < nCouples; i++) {
    hinge = hinge
      .fuse(support.clone().translateX((-1) ** i * i * 2 * translationStep))
      .fuse(
        mirrorSupport
          .clone()
          .translateX((-1) ** (i + 1) * i * 2 * translationStep)
      );
  }
  if (height / 2 - radius > radius / 2)
    hinge = hinge.chamfer(radius / 2, (e) =>
      e.inDirection("X").inPlane("XY").inPlane("XZ")
    );

  return {
    hinge: hinge,
    hingeWidth: radius + backTolerance,
  };
}

export function makeFlatHinge(height, width, baseHeight, tolerance = 0.4) {
  const radius = height / 2;
  const { draw, drawRoundedRectangle } = replicad;

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
  base = base
    .cut(spacer())
    .cut(spacer().translate(width / 4, 0))
    .cut(spacer().translate(-width / 4, 0));

  const flapLength = radius + tolerance;

  const flaps = fuseAll([
    drawRoundedRectangle(width / 4 - tolerance / 2, flapLength).translate(
      -width / 2 + (width / 4 - tolerance / 2) / 2,
      flapLength / 2
    ),
    drawRoundedRectangle(width / 4 - tolerance, flapLength).translate(
      width / 4 / 2,
      flapLength / 2
    ),

    drawRoundedRectangle(width / 4 - tolerance / 2, flapLength).translate(
      -(-width / 2 + (width / 4 - tolerance / 2) / 2),
      -flapLength / 2
    ),

    drawRoundedRectangle(width / 4 - tolerance, flapLength).translate(
      -(width / 4) / 2,
      -flapLength / 2
    ),
  ])
    .sketchOnPlane()
    .extrude(baseHeight);
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
