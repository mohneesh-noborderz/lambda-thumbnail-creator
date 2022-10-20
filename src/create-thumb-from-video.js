const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const doesFileExist = require("./does-file-exist");
const generateTmpFilePath = require("./generate-tempfile");

const ffprobePath = "/opt/bin/ffprobe";
const ffmpegPath = "/opt/bin/ffmpeg";

const THUMBNAIL_TARGET_BUCKET = "api-test-xana";

module.exports = async (tmpVideoPath, numberOfThumbnails, videoFileName) => {
    // const randomTimes = generateRandomTimes(tmpVideoPath, numberOfThumbnails);

    // for(const [index, randomTime] of Object.entries(randomTimes)) {
    //     const tmpThumbnailPath = await createImageFromVideo(tmpVideoPath, randomTime);
    //     console.log('generated temp file', tmpThumbnailPath);
    //     if (doesFileExist(tmpThumbnailPath)) {
    //         const nameOfImageToCreate = generateNameOfImageToUpload(videoFileName, index);
    //         console.log({nameOfImageToCreate});
    //         const thumbres = await uploadFileToS3(tmpThumbnailPath, nameOfImageToCreate);
    //         console.log(thumbres);
    //     }
    // }

    const tmpThumbnailPath = await createImageFromVideo(tmpVideoPath, 0);
    console.log("generated temp file", tmpThumbnailPath);
    if (doesFileExist(tmpThumbnailPath)) {
        const nameOfImageToCreate = generateNameOfImageToUpload(
            videoFileName,
            0
        );
        console.log({ nameOfImageToCreate });
        const thumbres = await uploadFileToS3(
            tmpThumbnailPath,
            nameOfImageToCreate
        );
        console.log(thumbres);
    }
};

const generateRandomTimes = (tmpVideoPath, numberOfTimesToGenerate) => {
    const timesInSeconds = [0];
    const videoDuration = getVideoDuration(tmpVideoPath);

    for (let x = 0; x < numberOfTimesToGenerate; x++) {
        const randomNum = getRandomNumberNotInExistingList(
            timesInSeconds,
            videoDuration
        );

        if (randomNum >= 0) {
            timesInSeconds.push(randomNum);
        }
    }
    console.log({ timesInSeconds });

    return timesInSeconds;
};

const getRandomNumberNotInExistingList = (existingList, maxValueOfNumber) => {
    for (let attemptNumber = 0; attemptNumber < 3; attemptNumber++) {
        const randomNum = getRandomNumber(maxValueOfNumber);

        if (!existingList.includes(randomNum)) {
            return randomNum;
        }
    }

    return -1;
};

const getRandomNumber = (upperLimit) => {
    return Math.floor(Math.random() * upperLimit);
};

const getVideoDuration = (tmpVideoPath) => {
    const ffprobe = spawnSync(ffprobePath, [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        tmpVideoPath,
    ]);

    return Math.floor(ffprobe.stdout.toString());
};

const createImageFromVideo = (tmpVideoPath, targetSecond) => {
    console.log({ tmpVideoPath, targetSecond });
    const tmpThumbnailPath = generateThumbnailPath(targetSecond);
    // console.log({ tmpThumbnailPath });
    const ffmpegParams = createFfmpegParams(
        tmpVideoPath,
        tmpThumbnailPath,
        targetSecond
    );
    // console.log({ffmpegParams});
    spawnSync(ffmpegPath, ffmpegParams);

    return tmpThumbnailPath;
};

const generateThumbnailPath = (targetSecond) => {
    const tmpThumbnailPathTemplate = "/tmp/thumbnail-{HASH}-{num}.jpg";
    const uniqueThumbnailPath = generateTmpFilePath(tmpThumbnailPathTemplate);
    const thumbnailPathWithNumber = uniqueThumbnailPath.replace(
        "{num}",
        targetSecond
    );

    return thumbnailPathWithNumber;
};

const createFfmpegParams = (tmpVideoPath, tmpThumbnailPath, targetSecond) => {
    return [
        "-ss",
        targetSecond,
        "-i",
        tmpVideoPath,
        // "-vf", "thumbnail,scale='-1:min(720\, iw)'",
        "-vf",
        "fps=10:round=zero:start_time=0",
        // "-vf","select=eq(n\,0)",
        "-vframes",
        1,
        tmpThumbnailPath,
    ];
};

const generateNameOfImageToUpload = (videoFileName, i) => {
    const ext = path.extname(videoFileName);
    const strippedExtension = videoFileName
        .replace(ext, "")
        .replace("input/videos", "thumbnails");
    return `${strippedExtension}.000000${i}.jpg`;
};

const uploadFileToS3 = async (tmpThumbnailPath, nameOfImageToCreate) => {
    const contents = fs.createReadStream(tmpThumbnailPath);
    const uploadParams = {
        Bucket: THUMBNAIL_TARGET_BUCKET,
        Key: nameOfImageToCreate,
        Body: contents,
        ContentType: "image/jpg",
    };

    const s3 = new AWS.S3();
    await s3.putObject(uploadParams).promise();
};
