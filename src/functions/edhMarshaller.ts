import {Callback, Context, Handler} from "aws-lambda";
import {AWSError, SQS} from "aws-sdk";
import {SQService} from "../services/SQService";
import {PromiseResult} from "aws-sdk/lib/request";
import {SendMessageResult} from "aws-sdk/clients/sqs";
import {GetRecordsOutput} from "aws-sdk/clients/dynamodbstreams";
import {debugOnlyLog, getTargetQueueFromSourceARN} from "../utils/Utils";
import {StreamRecord} from "../models";

/**
 * λ function to process a DynamoDB stream of test results into a queue for certificate generation.
 * @param event - DynamoDB Stream event
 * @param context - λ Context
 * @param callback - callback function
 */
const edhMarshaller: Handler = async (event: GetRecordsOutput, context?: Context, callback?: Callback): Promise<void | Array<PromiseResult<SendMessageResult, AWSError>>> => {
    if (!event) {
        console.error("ERROR: event is not defined.");
        return;
    }
    const records = event.Records as StreamRecord[];
    if (!records || !records.length) {
        console.error("ERROR: No Records in event: ", event);
        return;
    }

    debugOnlyLog("Records: ", records);

    // Instantiate the Simple Queue Service
    const sqService: SQService = new SQService(new SQS());
    const sendMessagePromises: Array<Promise<PromiseResult<SendMessageResult, AWSError>>> = [];

    records.forEach((record: StreamRecord) => {
        debugOnlyLog("Record: ", record);
        debugOnlyLog("New image: ", record.dynamodb?.NewImage);
        const targetQueues = getTargetQueueFromSourceARN(record.eventSourceARN);
        debugOnlyLog("Target Queue and DLQ", targetQueues);
        const targetQueue = targetQueues.targetQueue;
        const targetDLQ = targetQueues.targetDlq;
        debugOnlyLog("Target Queue", targetQueue);
        debugOnlyLog("Target DLQ", targetDLQ);
        const eventType = record.eventName; //INSERT, MODIFY or REMOVE

        // check if the payload is bigger than 256KB - SQS has a limit of 256Kb per message
        console.log("Message size", record.dynamodb!.SizeBytes!);
        if (record.dynamodb!.SizeBytes! > 262144) {
            console.log("Message is bigger");
            // message is too big - send to DLQ only relevant details
            delete record.dynamodb?.NewImage;
            debugOnlyLog("Output DLQ message", record);
            sendMessagePromises.push(sqService.sendMessage(JSON.stringify(record), targetDLQ));
        } else {
            console.log("Message is smaller than 256kb");
            // send to target Queue
            const message = {
                eventType,
                body: record.dynamodb
            };
            debugOnlyLog("Output message", message);
            sendMessagePromises.push(sqService.sendMessage(JSON.stringify(message), targetQueue))
        }
    });

    return Promise.all(sendMessagePromises)
        .catch((error: AWSError) => {
            console.error(error);
            console.log("records");
            console.log(records);
            // retry the message up to X times -> then it's moved automatically to DLQ - configurable from AWS
            console.log("Should retry up to X times");
            throw error;

            // do not retry 4XX error codes, except 429. Retry only 500 and 429.
            // if ((error.statusCode >= 400 && error.statusCode < 500) && error.statusCode !== 429) {
            //     // return something so the Lambda won't retry
            //     return;
            // } else {
            //     // throw the error so the Lambda will retry
            //     throw error;
            // }
        });
};

export {edhMarshaller};
