const fs = require("fs");
const path = require("path");
const doesFileExist = require("./does-file-exist");
const downloadVideoToTmpDirectory = require("./get-video-from-s3");
const generateThumbnailsFromVideo = require("./create-thumb-from-video");

const THUMBNAILS_TO_CREATE = 3;

exports.handler = async (event) => {
    await wipeTmpDirectory();
    const { videoFileName, triggerBucketName } = extractParams(event);
    const tmpVideoPath = await downloadVideoToTmpDirectory(
        triggerBucketName,
        videoFileName
    );

    console.log({ videoFileName, triggerBucketName });
    console.log(`Video downloaded to ${tmpVideoPath}`);
    if (doesFileExist(tmpVideoPath)) {
        await generateThumbnailsFromVideo(
            tmpVideoPath,
            THUMBNAILS_TO_CREATE,
            videoFileName
        );
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
