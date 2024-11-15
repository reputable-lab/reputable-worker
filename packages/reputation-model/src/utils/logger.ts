import path from 'path';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { formatInTimeZone } from 'date-fns-tz';
import { createLogger, transports, format, config } from 'winston';
import 'dotenv/config';
import DailyRotateFile from 'winston-daily-rotate-file';
import { formatDuration } from './utils';

const logtail = new Logtail(process.env.LOGTAIL_ACCESS_TOKEN_REPUTATION_MODEL);

// Determine environment (dev or prod)
const env = process.env.NODE_ENV;
const logFolder = env === 'prod' ? 'prod' : 'dev';

// Define custom format
const myFormat = format.combine(
  format.timestamp({
    format: () => {
      return formatInTimeZone(
        new Date(),
        'Europe/Paris',
        'yyyy-MM-dd HH:mm:ss'
      );
    },
  }),
  format.align(),
  format.printf((info) => {
    // Check if durationMs is present in the info object: logger.profile(...)
    if (info.durationMs) {
      return `[${info.timestamp}] ${info.level}: ${info.message} duration ${formatDuration(info.durationMs)}`;
    }
    return `[${info.timestamp}] ${info.level}: ${info.message}`;
  })
);

const options = {
  console: {
    handleExceptions: true,
    level: 'debug',
    format: format.combine(format.colorize(), myFormat),
  },
  file: {
    filename: path.join('./logs', logFolder, 'error.log'),
    level: 'error',
    format: format.combine(format.uncolorize(), myFormat),
  },
  rotate: {
    filename: path.join('./logs', logFolder, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '1d', // Keep logs for 1 day only
    zippedArchive: true,
    format: format.combine(format.uncolorize(), myFormat),
  },
};

const logger = createLogger({
  defaultMeta: { service: 'Reputation-Model' },
  levels: config.npm.levels,
  transports: [
    new transports.Console(options.console),
    new transports.File(options.file),
    new DailyRotateFile(options.rotate),
    new LogtailTransport(logtail),
  ],
});

export default logger;
