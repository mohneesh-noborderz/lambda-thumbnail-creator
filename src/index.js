const fs = require("fs");
const path = require("path");
const doesFileExist = require("./does-file-exist");
const downloadVideoToTmpDirectory = require("./get-video-from-s3");
const generateThumbnailsFromVideo = require("./create-thumb-from-video");
const AWS = require("aws-sdk");

const THUMBNAILS_TO_CREATE = 1;

const snsParams = {
    Message: "",
    TopicArn: "arn:aws:sns:us-east-1:845847047647:dev-xana-make-thumb",
};

const SNS = new AWS.SNS({ apiVersion: "2010-03-31" });

exports.handler = async (event) => {
    try {
        await wipeTmpDirectory();
        const { videoFileName, triggerBucketName } = extractParams(event);
        const tmpVideoPath = await downloadVideoToTmpDirectory(
            triggerBucketName,
            videoFileName
        );

        console.log({ videoFileName, triggerBucketName });
        console.log(`Video downloaded to ${tmpVideoPath}`);
        if (doesFileExist(tmpVideoPath)) {
            const isThumb = await generateThumbnailsFromVideo(
                tmpVideoPath,
                THUMBNAILS_TO_CREATE,
                videoFileName
            );
            if (isThumb) {
                console.log({ isThumb });
                snsParams.Message = `thumbnail is created for ${videoFileName}`;
                const publishTextPromise = await SNS.publish(
                    snsParams
                ).promise();
                console.log(
                    `Message ${snsParams.Message} sent to the topic ${snsParams.TopicArn}`
                );
                console.log("MessageID is " + publishTextPromise.MessageId);
            }
        }
    } catch (err) {
        console.error(err);
    }
};

const extractParams = (event) => {
    const videoFileName = decodeURIComponent(
        event.Records[0].s3.object.key
    ).replace(/\+/g, " ");
    const triggerBucketName = event.Records[0].s3.bucket.name;

    return { videoFileName, triggerBucketName };
};

const wipeTmpDirectory = async () => {
    const files = await fs.promises.readdir("/tmp/");
    const filePaths = files.map((file) => path.join("/tmp/", file));
    await Promise.all(filePaths.map((file) => fs.promises.unlink(file)));
};
