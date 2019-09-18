
import BggGameLoader from "../../src/services/BggGameLoader";
import BggGameService from "../../src/services/BggGameService";
import * as fetchMock from "fetch-mock";
import { getHugeCollection, getLargeCollection } from "./BggGameService.test";
import { GameInfo } from "../../src/models/GameInfo";
import { alchemists, sevenWonders, smallWorld } from "./model/TestGames";
import { CollectionMerger } from "../../src/services/CollectionMerger";

describe("Loading games", () => {

    const fetch = fetchMock.sandbox();
    afterEach(fetch.restore);

    const service = new BggGameService(fetch);
    const merger = new CollectionMerger();
    let loader: BggGameLoader;

    beforeEach(() => {
        loader = new BggGameLoader(service, merger);
    });

    it("fetches collections when requested", () => {
        const collections = ["Warium", "Nakul"];

        const getMock = jest.fn((username) => (new Promise<GameInfo[]>((resolver) => resolver(
            getLargeCollection()
        ))));
        service.getUserCollection = getMock;
        loader.loadCollections(collections);
        expect(getMock.mock.calls).toHaveLength(2);
        expect(getMock.mock.calls[0][0]).toBe("Warium");
        expect(getMock.mock.calls[1][0]).toBe("Nakul");
    });

    it("can inform about game updates", async () => {
        const collections = ["Warium", "Nakul"];
        const getMock = jest.fn((username) => (new Promise<GameInfo[]>(async (resolver) => resolver(
            await getLargeCollection()
        ))));
        const onUpdateMock = jest.fn();
        loader.onGamesUpdate(onUpdateMock);
        service.getUserCollection = getMock;
        // Act
        await loader.loadCollections(collections);
        // Expect
        expect(getMock.mock.calls).toHaveLength(2);
        expect(onUpdateMock.mock.calls).toHaveLength(2);
    });

    it("can get the users currently shown", () => {
        const collections = ["Warium", "Nakul"];
        const getMock = jest.fn((username) => (new Promise<GameInfo[]>(async (resolver) => resolver(
            await getLargeCollection()
        ))));
        service.getUserCollection = getMock;
        loader.loadCollections(collections);
        expect(loader.getCurrentNames()).toEqual(collections);

    });

    it("can show requests which are currently fetching", async () => {
        const collections = ["Warium"];
        let resolver: (value?: Promise<GameInfo[]>) => void;
        const getMock = jest.fn((username) => (new Promise<GameInfo[]>((r) => resolver = r)));
        service.getUserCollection = getMock;
        const promise = loader.loadCollections(collections);
        expect(getMock.mock.calls[0][0]).toBe("Warium");
        expect(loader.getLoadingInfo()).toEqual([
            { username: "Warium", isWaitingForRetry: false }
        ]);
        const handler = jest.fn((games) => {
            expect(loader.getLoadingInfo()).toEqual([]);
        });
        loader.onGamesUpdate(handler);
        resolver(getLargeCollection());
        await promise;
        expect(handler.mock.calls).toHaveLength(1);
    });


    it("continuesly updates the collection list", async () => {
        const usernames = ["Warium", "Cyndaq", "Nakul"];
        const collections = {
            Warium: [alchemists()],
            Cyndaq: [sevenWonders()],
            Nakul: [alchemists(), smallWorld()]
        };

        service.getUserCollection = jest.fn((username) => (new Promise<GameInfo[]>(async (resolver) => resolver(
            collections[username]
        ))));

        const onUpdateMock = jest.fn((games) => { });

        loader.onGamesUpdate(onUpdateMock);

        // act
        await loader.loadCollections(usernames);

        expect(onUpdateMock.mock.calls).toHaveLength(3);
        expect(onUpdateMock.mock.calls[0][0]).toHaveLength(1);
        expect(onUpdateMock.mock.calls[1][0]).toHaveLength(2);
        expect(onUpdateMock.mock.calls[2][0]).toHaveLength(3);
    });
});
