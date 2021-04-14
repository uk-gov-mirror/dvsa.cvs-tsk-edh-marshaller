import SQS, {GetQueueUrlResult, MessageBodyAttributeMap, SendMessageResult} from "aws-sdk/clients/sqs";
import {Configuration} from "../utils/Configuration";
import {PromiseResult} from "aws-sdk/lib/request";
import {AWSError, config as AWSConfig} from "aws-sdk";
import {ERROR} from "../models/enums";
import {debugOnlyLog} from "../utils/Utils";
// tslint:disable-next-line
const AWSXRay = require("aws-xray-sdk");


/**
 * Service class for interfacing with the Simple Queue Service
 */
class SQService {
    private readonly sqsClient: SQS;
    private readonly config: any;

    /**
     * Constructor for the ActivityService class
     * @param sqsClient - The Simple Queue Service client
     */
    constructor(sqsClient: SQS) {
        const config: any = Configuration.getInstance().getConfig();
        this.sqsClient = AWSXRay.captureAWSClient(sqsClient);

        if (!config.sqs) {
            throw new Error(ERROR.NO_SQS_CONFIG);
        }

        // Not defining BRANCH will default to local
        debugOnlyLog("branch", process.env.BRANCH);
        const env: string = (!process.env.BRANCH || process.env.BRANCH === "local") ? "local" : "remote";
        this.config = config.sqs[env];

        this.config.params.region = 'eu-west-1';
        AWSConfig.sqs = this.config.params;
        debugOnlyLog("SQS config", AWSConfig.sqs);
        debugOnlyLog("SQS config .region", AWSConfig.sqs?.region);
    }

    /**
     * Send a message to the specified queue (the AWS SQS queue URL is resolved based on the queueName for each message )
     * @param messageBody - A string message body
     * @param messageAttributes - A MessageAttributeMap
     * @param queueName - The queue name
     */
    public async sendMessage(messageBody: string, queueName: string, messageAttributes?: MessageBodyAttributeMap): Promise<PromiseResult<SendMessageResult, AWSError>> {
        // Get the queue URL for the provided queue name
        const queueUrlResult: GetQueueUrlResult = await this.sqsClient.getQueueUrl({ QueueName: queueName })
        .promise();

        const params = {
            QueueUrl: queueUrlResult.QueueUrl,
            MessageBody: messageBody
        };

        if (messageAttributes) {
            Object.assign(params, { MessageAttributes: {
                ...messageAttributes,
                AWSTraceHeader: process.env._X_AMZN_TRACE_ID
            } });
        }

        debugOnlyLog("sendMessage params", params);

        // Send a message to the queue
        return this.sqsClient.sendMessage(params as SQS.Types.SendMessageRequest).promise();
    }
}

export {SQService};
