import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { formatInTimeZone } from 'date-fns-tz';
import { createLogger, transports, format } from 'winston';
import 'winston-daily-rotate-file';
import { formatDuration } from './utils';

export const loggerFactory = (configService: ConfigService) => {
  const logtail = new Logtail(
    configService.get<string>('LOGTAIL_ACCESS_TOKEN_API')
  );

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

  const transportArray = [
    new transports.Console(options.console),
    new transports.File(options.file),
    new transports.DailyRotateFile(options.rotate),
    new LogtailTransport(logtail),
  ];

  const logger = createLogger({
    defaultMeta: { service: 'API' },
    level: 'info',
    transports: transportArray,
  });

  return logger;
};
