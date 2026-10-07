import { describe, expect, it } from "vitest";

import { makeConfiguredDevice } from "../_make-configured-device.js";
import { DeviceState } from "../../src/api/types/devices.js";
import {
  activeFacetCount,
  applyFacetFilters,
  type FacetSelection,
} from "../../src/util/device-filter.js";
import { computeNetworkFacet } from "../../src/util/facets.js";

const device = makeConfiguredDevice;

const emptySelection: FacetSelection = {
  selectedLabels: [],
  selectedAreas: [],
  selectedPlatforms: [],
  selectedNetworks: [],
  selectedStates: [],
  selectedUpdateStatus: [],
};

const FLEET = [
  device({ configuration: "a.yaml", runtime_state: { network: "wifi" } }),
  device({ configuration: "b.yaml", runtime_state: { network: "ethernet" } }),
  device({ configuration: "c.yaml", runtime_state: { network: "wifi" } }),
  device({ configuration: "d.yaml" }),
];

describe("computeNetworkFacet", () => {
  it("tallies the raw wire values, most-populated first", () => {
    expect(computeNetworkFacet(FLEET)).toEqual([
      { id: "wifi", name: "wifi", count: 2 },
      { id: "ethernet", name: "ethernet", count: 1 },
    ]);
  });

  it("drops devices that never announced a link", () => {
    expect(computeNetworkFacet([device({ configuration: "x.yaml" })])).toEqual([]);
  });

  it("counts an offline device, since the value is persisted", () => {
    const options = computeNetworkFacet([
      device({
        configuration: "asleep.yaml",
        runtime_state: { state: DeviceState.OFFLINE, network: "ethernet" },
      }),
    ]);
    expect(options).toEqual([{ id: "ethernet", name: "ethernet", count: 1 }]);
  });
});

describe("applyFacetFilters network", () => {
  it("narrows to the selected network", () => {
    const out = applyFacetFilters(FLEET, {
      ...emptySelection,
      selectedNetworks: ["ethernet"],
    });
    expect(out.map((d) => d.configuration)).toEqual(["b.yaml"]);
  });

  it("ORs within the facet", () => {
    const out = applyFacetFilters(FLEET, {
      ...emptySelection,
      selectedNetworks: ["wifi", "ethernet"],
    });
    expect(out).toHaveLength(3);
  });

  it("never matches an unknown link on an empty selection id", () => {
    const out = applyFacetFilters(FLEET, { ...emptySelection, selectedNetworks: [""] });
    expect(out).toEqual([]);
  });

  it("counts network selections toward the Filters badge", () => {
    expect(
      activeFacetCount({ ...emptySelection, selectedNetworks: ["wifi", "ethernet"] })
    ).toBe(2);
  });
});
