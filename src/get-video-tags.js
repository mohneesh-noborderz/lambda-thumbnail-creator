const AWS = require("aws-sdk");

const getObjectTags = async (bucket, key) => {
    try {
        /* code */
        const s3 = new AWS.S3();
        const tagsets = {};

        const params = { Bucket: bucket, Key: key };

        const obj = await s3.getObjectTagging(params).promise();

        obj.TagSet.forEach((el) => {
            console.log(el);
            tagsets[el.Key] = el.Value;
        });

        // console.log({tagsets});
        return tagsets;
    } catch (e) {
        console.error(e);
    }
};

const getUserId = async (bucket, key) => {
    try {
        const tagsets = await getObjectTags(bucket, key);
        return tagsets;
    } catch (err) {
        console.log("error fetching tags --->>>>>**", err);
    }
};

module.exports = { getUserId, getObjectTags };
