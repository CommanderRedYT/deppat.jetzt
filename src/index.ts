import express from 'express';
import fs from 'fs';
import morgan from 'morgan';
import * as punycode from 'punycode/';

const app = express();

const isDev = process.env.NODE_ENV === 'development';

app.enable('trust proxy');

app.use(morgan(isDev ? 'dev' : 'combined'));

const port = process.env.PORT || 3000;

const baseDomain = process.env.BASE_DOMAIN || 'deppat.jetzt';

const capitalize = (str: string): string =>
    str.charAt(0).toUpperCase() + str.slice(1);

const requestCounter: Record<
    string,
    {
        count: number;
        lastRequest: Date;
    }
> = {};

function extractSenderIp(req: express.Request): string {
    return (
        (req.headers['x-real-ip'] as string) || req.socket.remoteAddress || ''
    );
}

function handleFunnyRequests(ip: string): boolean {
    if (!requestCounter[ip]) {
        return false;
    }

    const last10Seconds = new Date(Date.now() - 10 * 1000);

    if (requestCounter[ip].lastRequest < last10Seconds) {
        requestCounter[ip].count = 0;
    }

    return requestCounter[ip].count > 10;
}

const textOutline = (color: string): string =>
    `-2px -2px 0 ${color}, 2px -2px 0 ${color}, -2px 2px 0 ${color}, 2px 2px 0 ${color}`;

// https://www.reddit.com/r/okoidawappler/comments/iu17ho/pdb_der_baumaxl_nennt_di_an_oasch_wos_tuast/
const gehtMirAmArsch = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Schleich di!</title>
    <style>
        @keyframes movingBackground {
            0% {
                background-position: 0 0;
            }
            100% {
                background-position: 1240px 0;
            }
        }

        @keyframes rainbowText {
            0% {
                color: red;
                /* outline: 1px solid green; */
                text-shadow: ${textOutline('green')};
            }

            16% {
                color: orange;
                /* outline: 1px solid blue; */
                text-shadow: ${textOutline('blue')};
            }

            33% {
                color: yellow;
                /* outline: 1px solid indigo; */
                text-shadow: ${textOutline('indigo')};
            }

            50% {
                color: green;
                /* outline: 1px solid red; */
                text-shadow: ${textOutline('red')};
            }

            66% {
                color: blue;
                /* outline: 1px solid orange; */
                text-shadow: ${textOutline('orange')};
            }

            83% {
                color: indigo;
                /* outline: 1px solid yellow; */
                text-shadow: ${textOutline('yellow')};
            }

            100% {
                color: red;
                /* outline: 1px solid green; */
                text-shadow: ${textOutline('green')};
            }
        }

        .oida {
          background-image: url("data:image/octet-stream;base64,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");
          // make it 1240px wide and 100% high;
          background-size: 1240px 100%;
          background-position: 0 0;
          background-repeat: repeat;
          background-color: #fff;
          animation: movingBackground 1s linear infinite;
        }
        html, body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: 100%;
            height: 100%;
            cursor: url('data:image/x-icon;base64,AAACAAEAICAQAAAAAADoAgAAFgAAACgAAAAgAAAAQAAAAAEABAAAAAAAAAIAAAAAAAAAAAAAEAAAAAAAAAAAAAAAGgr8AAr8RwDsm/IAXFlbAIHm9wAK6PwA+vf5APwKrAD8cwoACqD8AM9EswAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABEAABEAARAAAAAAAAARAAAAAAAAAAAAAAAAAAAAERABVVVUEREREREAAAAAIgAAFVTMwREAAAABEAAiIiIiABVOzBDNARARAQzAIiImZmQUzOwQzREREREMwCZmZmZkFOzMERABEQEAEQAmZmZkABTM7BERwRERHBEACIiAABAUzMzBEREREREQAAiAEREQFMzswREQAAEREAAZgREAABTMzMERAMzUERAAGZgAAqgU7MzBEAzs1AEQACqqqqqoFMzMzADMzNQAAAAqqoRERBVMzszszNVUAAAABERERERBVVVVVVVVQAAAAAREQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD////////////////////////////////////////////44x/8cMIf/CAAB/wAAAP4AAABgAAAAIAAAACAAAAAgAAAAIAAAAGAAAABgAAAAYAAAAGAAAATgAAAH4AAAD+H8AB///////////9/////P////x////8P////B////w=='), auto;
        }

        h1 {
            text-align: center;
            padding-top: 20%;
            font-size: 3em;
            animation: rainbowText 3s infinite;
        }
        
        a {
            display: block;
            color: black;
            background-color: white;
            bottom: 0;
            left: 0;
            position: fixed;
            padding: 10px;
        }
    </style>
</head>
<body class="oida" onclick="location.href='https://www.youtube.com/watch?v=dQw4w9WgXcQ'">
    <h1>Oida geh mia ned am Oasch!</h1>
    <a href="https://www.reddit.com/r/okoidawappler/comments/iu17ho/pdb_der_baumaxl_nennt_di_an_oasch_wos_tuast/">Image credit</a>
</body>
</html>
`;

app.get('/', (req, res) => {
    const ip = extractSenderIp(req);

    if (!requestCounter[ip]) {
        requestCounter[ip] = {
            count: 0,
            lastRequest: new Date(),
        };
    }

    // set isFunny to true if more than 10 requests from the same IP in the last 10 seconds
    const isFunny = handleFunnyRequests(ip);

    if (isFunny) {
        const content = `${ip} - ${requestCounter[ip].lastRequest.toISOString()}\n`;

        console.log(content);

        fs.appendFileSync('./deppat.txt', content);

        res.status(429).send(gehtMirAmArsch);
        return;
    }

    requestCounter[ip].count += 1;
    requestCounter[ip].lastRequest = new Date();

    const url = new URL(req.originalUrl, `http://${req.headers.host}`);
    const rawDomain = url.hostname;
    const domain = punycode.toUnicode(rawDomain);
    const isSubdomain = domain.split('.').length > 2;

    const split = domain.split(`.${baseDomain}`);
    const name = isSubdomain ? split[0].replace(/-/g, ' ') : 'Ois';

    console.log(
        `Request for ${name} from with rawDomain=${rawDomain} name=${name} isSubdomain=${isSubdomain}`,
    );

    res.send(
        `<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>#deppat{font-family:'Comic Sans MS',cursive,sans-serif;font-weight:bold}</style><title>Ois deppat!</title></head>${capitalize(name)} is scho wieda komplett <span id="deppat">deppat</span>!${isSubdomain ? '' : '🤪'}`,
    );
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
