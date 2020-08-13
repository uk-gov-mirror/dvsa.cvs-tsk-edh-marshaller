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
    const event = {
      Records: [{
        "eventSourceARN":"test-results",
        "eventName":"INSERT",
        "dynamodb":{
          "some": "thing"
        }
      }]
    };
    it("should invoke SQS service with correct params", async () => {
      const sendMessageMock = jest.fn().mockResolvedValue("howdy");
      jest.spyOn(SQService.prototype, "sendMessage").mockImplementation(sendMessageMock);

      await edhMarshaller(event, ctx, () => { return; });
      expect(sendMessageMock).toHaveBeenCalledWith(JSON.stringify({eventType:"INSERT",body:{"some":"thing"}}), "cvs-edh-dispatcher-test-results-local-queue");
      expect(sendMessageMock).toHaveBeenCalledTimes(1);
    });

    describe("when SQService throws an error", () => {
      context("and the error is from 4XX error family, except 429", () => {
        it("should NOT throw the error up and return undefined so the Lambda won't retry", async () => {
          jest.spyOn(SQService.prototype, "sendMessage").mockRejectedValue({statusCode: 413, message: "It broke"});

            const result = await edhMarshaller(event, ctx, () => { return; });
            expect(result).toEqual(undefined);
        });
      });

      context("and the error is 429", () => {
        it("should throw the error up", async () => {
          jest.spyOn(SQService.prototype, "sendMessage").mockRejectedValue({statusCode: 429, message: "It broke"});

          try{
            expect(await edhMarshaller(event, ctx, () => { return; })).toThrowError();
          } catch(e) {
            expect(e.statusCode).toEqual(429);
            expect(e.message).toEqual("It broke");
          }
        });
      });

      context("and the error is from 5XX error family", () => {
        it("should throw the error up", async () => {
          jest.spyOn(SQService.prototype, "sendMessage").mockRejectedValue({statusCode: 500, message: "It broke"});

          try{
            expect(await edhMarshaller(event, ctx, () => { return; })).toThrowError();
          } catch(e) {
            expect(e.statusCode).toEqual(500);
            expect(e.message).toEqual("It broke");
          }
        });
      });
    });
  });
});
