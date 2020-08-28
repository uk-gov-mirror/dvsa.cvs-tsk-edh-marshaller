import {edhMarshaller} from "../../src/functions/edhMarshaller";
import {SQService} from "../../src/services/SQService";
import {Configuration} from "../../src/utils/Configuration";
import {Context} from "aws-lambda";

describe("edhMarshaller Function", () => {
  // @ts-ignore
  const ctx: Context = null;
  // @ts-ignore
  Configuration.instance = new Configuration("../../src/config/config.yml");
  afterAll(() => {
    jest.restoreAllMocks();
    jest.resetModuleRegistry();
  });

  describe("if the event is undefined", () => {
    it("should return undefined", async () => {
      expect.assertions(1);
      const result = await edhMarshaller(undefined, ctx, () => { return; });
      expect(result).toBe(undefined);
    });
  });

  describe("if the event has no records", () => {
    it("should return undefined", async () => {
      expect.assertions(1);
      const result = await edhMarshaller({something: "not records"}, ctx, () => { return; });
      expect(result).toBe(undefined);
    });
  });

  describe("with good event", () => {
    let event: any;
    beforeEach(() => {
      event = {
        Records: [{
          "eventSourceARN":"test-results",
          "eventName":"INSERT",
          "dynamodb":{
            "some": "thing",
            "NewImage": "payload",
            "SizeBytes": 1554
          }
        }]
      };
    });
    afterEach(() => {
      event = null;
    });

    context("when the item size is smaller than 256KB", () => {
        it("should invoke SQS service with correct params", async () => {
        const sendMessageMock = jest.fn().mockResolvedValue("howdy");
        jest.spyOn(SQService.prototype, "sendMessage").mockImplementation(sendMessageMock);

        await edhMarshaller(event, ctx, () => { return; });
        expect(sendMessageMock).toHaveBeenCalledWith(JSON.stringify({eventType: "INSERT", body: {"some":"thing", "NewImage": "payload", "SizeBytes": 1554}}), "cvs-edh-dispatcher-test-results-local-queue");
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
      });
    });

    context("when the item size is bigger than 256KB", () => {
      it("should invoke SQS service with correct params", async () => {
        event.Records[0].dynamodb.SizeBytes = 300000;
        const expectedMessage = {
          eventSourceARN: "test-results",
          eventName: "INSERT",
          dynamodb: {
            some: "thing",
            SizeBytes: 300000
          }
        };
        const sendMessageMock = jest.fn().mockResolvedValue("howdy");
        jest.spyOn(SQService.prototype, "sendMessage").mockImplementation(sendMessageMock);

        await edhMarshaller(event, ctx, () => { return; });
        expect(sendMessageMock).toHaveBeenCalledWith(JSON.stringify(expectedMessage), "cvs-edh-dispatcher-test-results-local-dlq");
        expect(sendMessageMock).toHaveBeenCalledTimes(1);
      });
    });

    describe("when SQService throws an error", () => {
        it("should throw the error up", async () => {
          jest.spyOn(SQService.prototype, "sendMessage").mockRejectedValue({statusCode: 400, message: "It broke"});

          try{
            expect(await edhMarshaller(event, ctx, () => { return; })).toThrowError();
          } catch(e) {
            expect(e.statusCode).toEqual(400);
            expect(e.message).toEqual("It broke");
          }
        });
    });
  });
});
