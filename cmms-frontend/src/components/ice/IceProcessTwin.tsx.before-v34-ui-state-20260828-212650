import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

type Props = {
  weightLb: number | null;
  targetLb: number;
  detectorState: string;
  online: boolean;
  progress: number;
};

const IMAGE_SRC =
  '/ice/latamfoods-silo-base.png';

function stateLabel(
  state: string
): string {
  switch (state) {
    case 'TRACKING_BAG':
      return 'LLENANDO SACO';

    case 'REMOVAL_CONFIRM':
      return 'CONFIRMANDO RETIRO';

    case 'WAITING_FOR_LOAD':
      return 'ESPERANDO';

    default:
      return 'SIN ESTADO';
  }
}

export default function IceProcessTwin({
  weightLb,
  targetLb,
  detectorState,
  online,
  progress,
}: Props) {
  const filling =
    online &&
    detectorState ===
      'TRACKING_BAG';

  const removal =
    online &&
    detectorState ===
      'REMOVAL_CONFIRM';

  const safeProgress =
    Math.max(
      0,
      Math.min(
        100,
        progress
      )
    );

  /*
   * Coordenadas sobre la fotografía
   * original 1672 x 941.
   */
  const bagBottom = 788;
  const bagCapacity = 190;

  const fillHeight =
    bagCapacity *
    (safeProgress / 100);

  const fillY =
    bagBottom -
    fillHeight;

  const particles =
    Array.from(
      { length: 24 },
      (_, index) => ({
        x:
          671 +
          ((index * 19) %
            74),

        delay:
          (index % 8) *
          0.09,

        duration:
          0.70 +
          (index % 4) *
          0.08,

        radius:
          3 +
          (index % 3),
      })
    );

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',

        /*
         * MISMO ASPECT RATIO QUE LA FOTO.
         * No estiramos ni recortamos la máquina.
         */
        aspectRatio:
          '1672 / 941',

        width: '100%',
        overflow: 'hidden',

        borderRadius: 3,
        borderColor: '#dbe3ef',

        bgcolor: '#f8fafc',

        boxShadow:
          '0 8px 28px rgba(15,36,72,.06)',
      }}
    >
      {/* ===============================================
          FOTO BASE
          =============================================== */}

      <Box
        component="img"
        src={IMAGE_SRC}
        alt="Sistema de ensacado de hielo Latamfoods"
        draggable={false}
        sx={{
          position: 'absolute',
          inset: 0,

          width: '100%',
          height: '100%',

          objectFit: 'cover',
          objectPosition:
            'center center',

          display: 'block',

          transition:
            'filter .35s ease',

          filter:
            online
              ? 'none'
              : 'grayscale(.45) brightness(.88)',
        }}
      />


      {/* ===============================================
          SOMBREADO SUAVE PARA TARJETAS
          =============================================== */}

      <Box
        sx={{
          position: 'absolute',
          inset: 0,

          background: `
            linear-gradient(
              90deg,
              rgba(248,250,252,.25) 0%,
              rgba(248,250,252,0) 30%,
              rgba(248,250,252,0) 70%,
              rgba(248,250,252,.25) 100%
            )
          `,

          pointerEvents:
            'none',
        }}
      />


      {/* ===============================================
          SVG LIVE
          =============================================== */}

      <Box
        component="svg"
        viewBox="0 0 1672 941"
        preserveAspectRatio="xMidYMid meet"
        sx={{
          position: 'absolute',
          inset: 0,

          width: '100%',
          height: '100%',

          zIndex: 2,

          pointerEvents:
            'none',
        }}
      >
        <defs>
          {/* Glow */}
          <filter
            id="iceBlueGlow"
            x="-80%"
            y="-80%"
            width="260%"
            height="260%"
          >
            <feGaussianBlur
              stdDeviation="6"
              result="blur"
            />

            <feMerge>
              <feMergeNode
                in="blur"
              />

              <feMergeNode
                in="SourceGraphic"
              />
            </feMerge>
          </filter>


          {/* Hielo */}
          <linearGradient
            id="iceBagFill"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#dbeafe"
              stopOpacity=".72"
            />

            <stop
              offset="55%"
              stopColor="#93c5fd"
              stopOpacity=".68"
            />

            <stop
              offset="100%"
              stopColor="#3b82f6"
              stopOpacity=".62"
            />
          </linearGradient>


          {/* Máscara aproximada del saco izquierdo */}
          <clipPath id="bagOneClip">
            <path
              d="
                M625 590
                Q638 576 660 580
                H742
                Q760 580 770 592

                L763 777

                Q726 797
                 686 797

                Q650 797
                 628 780

                Z
              "
            />
          </clipPath>
        </defs>


        {/* =============================================
            FLUJO EN EL TRANSPORTADOR
            ============================================= */}

        <path
          d="
            M1192 805
            C1125 690
             1070 565
             1018 440

            C963 309
             907 176
             824 73
          "
          fill="none"

          stroke={
            filling
              ? '#3b82f6'
              : '#60a5fa'
          }

          strokeWidth={
            filling
              ? 7
              : 4
          }

          strokeLinecap="round"

          strokeDasharray={
            filling
              ? '18 15'
              : '8 18'
          }

          opacity={
            filling
              ? 0.90
              : 0.22
          }

          filter={
            filling
              ? 'url(#iceBlueGlow)'
              : undefined
          }
        >
          {filling && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;-66"
              dur=".85s"
              repeatCount="indefinite"
            />
          )}
        </path>


        {/* =============================================
            NIVEL DE HIELO DENTRO DEL SACO
            ============================================= */}

        {safeProgress > 0 && (
          <rect
            x="615"
            y={fillY}
            width="170"
            height={fillHeight}
            fill="url(#iceBagFill)"
            clipPath="url(#bagOneClip)"
          />
        )}


        {/* =============================================
            CUBOS / BURBUJAS DE HIELO DENTRO DEL SACO
            ============================================= */}

        <g
          clipPath="url(#bagOneClip)"
        >
          {Array.from(
            { length: 38 },
            (_, index) => {
              const cx =
                640 +
                ((index * 29) %
                  108);

              const cy =
                608 +
                ((index * 37) %
                  165);

              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={
                    4 +
                    (index % 4)
                  }
                  fill="#eff6ff"
                  stroke="#60a5fa"
                  strokeWidth="1.2"

                  opacity={
                    cy >= fillY
                      ? 0.84
                      : 0
                  }
                />
              );
            }
          )}
        </g>


        {/* =============================================
            CAÍDA DE HIELO
            SOLO TRACKING_BAG
            ============================================= */}

        {filling && (
          <g
            filter="url(#iceBlueGlow)"
          >
            {particles.map(
              (
                particle,
                index
              ) => (
                <circle
                  key={index}

                  cx={
                    particle.x
                  }

                  cy="555"

                  r={
                    particle.radius
                  }

                  fill="#eff6ff"
                  stroke="#60a5fa"
                  strokeWidth="1"

                  opacity="0"
                >
                  <animate
                    attributeName="cy"

                    values={`555;${
                      Math.max(
                        608,
                        fillY + 12
                      )
                    }`}

                    dur={`${particle.duration}s`}

                    begin={`${particle.delay}s`}

                    repeatCount="indefinite"
                  />

                  <animate
                    attributeName="opacity"

                    values="0;1;.92;0"

                    dur={`${particle.duration}s`}

                    begin={`${particle.delay}s`}

                    repeatCount="indefinite"
                  />
                </circle>
              )
            )}
          </g>
        )}


        {/* =============================================
            HOTSPOT BALANZA #1
            ============================================= */}

        {online && (
          <g>
            <circle
              cx="698"
              cy="815"

              r={
                filling
                  ? 19
                  : 12
              }

              fill="none"

              stroke={
                filling
                  ? '#2563eb'
                  : '#60a5fa'
              }

              strokeWidth="4"

              opacity=".55"
            >
              {filling && (
                <>
                  <animate
                    attributeName="r"
                    values="14;28;14"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />

                  <animate
                    attributeName="opacity"
                    values=".7;.08;.7"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </circle>
          </g>
        )}


        {/* =============================================
            CONFIRMACIÓN DE RETIRO
            ============================================= */}

        {removal && (
          <ellipse
            cx="698"
            cy="690"

            rx="105"
            ry="142"

            fill="none"

            stroke="#f59e0b"
            strokeWidth="5"

            opacity=".72"
          >
            <animate
              attributeName="rx"
              values="100;119;100"
              dur="1s"
              repeatCount="indefinite"
            />

            <animate
              attributeName="ry"
              values="136;154;136"
              dur="1s"
              repeatCount="indefinite"
            />

            <animate
              attributeName="opacity"
              values=".7;.18;.7"
              dur="1s"
              repeatCount="indefinite"
            />
          </ellipse>
        )}
      </Box>


      {/* ===============================================
          CABECERA INTERNA
          =============================================== */}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"

        sx={{
          position: 'absolute',

          zIndex: 4,

          top: {
            xs: 10,
            md: 17,
          },

          left: {
            xs: 10,
            md: 18,
          },

          right: {
            xs: 10,
            md: 18,
          },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            px: {
              xs: 1.2,
              md: 1.7,
            },

            py: {
              xs: .65,
              md: .9,
            },

            borderRadius: 999,

            bgcolor:
              'rgba(255,255,255,.90)',

            backdropFilter:
              'blur(10px)',

            border:
              '1px solid rgba(37,99,235,.12)',
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <Typography
              sx={{
                color:
                  '#2563eb',

                fontSize: {
                  xs: 16,
                  md: 20,
                },

                lineHeight: 1,
              }}
            >
              ❄
            </Typography>

            <Typography
              fontWeight={800}

              sx={{
                color:
                  '#10224a',

                fontSize: {
                  xs: 11,
                  sm: 13,
                  md: 15,
                },
              }}
            >
              SILO # 1 LATAMFOODS
            </Typography>
          </Stack>
        </Paper>


        <Chip
          size="small"

          label={
            online
              ? '●  Operación en vivo'
              : '●  Sin telemetría'
          }

          sx={{
            display: {
              xs: 'none',
              sm: 'flex',
            },

            bgcolor:
              'rgba(255,255,255,.91)',

            color:
              online
                ? '#15803d'
                : '#64748b',

            fontWeight: 800,

            backdropFilter:
              'blur(10px)',

            border:
              '1px solid rgba(15,23,42,.07)',
          }}
        />
      </Stack>


      {/* ===============================================
          BALANZA #1
          =============================================== */}

      <Paper
        elevation={0}

        sx={{
          position:
            'absolute',

          zIndex: 5,

          top: {
            xs: 55,
            md: 96,
          },

          left: {
            xs: 10,
            md: 22,
          },

          width: {
            xs: 170,
            sm: 205,
            md: 235,
          },

          p: {
            xs: 1.3,
            md: 1.8,
          },

          borderRadius: 3,

          bgcolor:
            'rgba(255,255,255,.94)',

          backdropFilter:
            'blur(11px)',

          border:
            filling
              ? '2px solid rgba(37,99,235,.75)'
              : '1px solid rgba(148,163,184,.32)',

          boxShadow:
            filling
              ? '0 0 0 5px rgba(37,99,235,.08), 0 14px 35px rgba(15,23,42,.10)'
              : '0 14px 35px rgba(15,23,42,.08)',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography
            fontWeight={800}

            sx={{
              fontSize: {
                xs: 12,
                md: 15,
              },

              color:
                '#17213a',
            }}
          >
            BALANZA #1
          </Typography>

          <Chip
            size="small"

            label={
              online
                ? 'ACTIVA'
                : 'SIN DATOS'
            }

            color={
              online
                ? 'success'
                : 'default'
            }

            sx={{
              height: 22,
              fontSize: 9,
              fontWeight: 800,
            }}
          />
        </Stack>


        <Chip
          size="small"

          label={
            stateLabel(
              detectorState
            )
          }

          sx={{
            mt: 1,

            maxWidth:
              '100%',

            bgcolor:
              filling
                ? '#0b7be7'
                : removal
                  ? '#f59e0b'
                  : '#eef2f7',

            color:
              filling ||
              removal
                ? '#fff'
                : '#475569',

            fontWeight: 800,

            fontSize: {
              xs: 9,
              md: 11,
            },
          }}
        />


        <Typography
          color="text.secondary"

          sx={{
            mt: 1.3,

            fontSize: {
              xs: 10,
              md: 12,
            },
          }}
        >
          Peso actual
        </Typography>


        <Typography
          sx={{
            color:
              '#1367e8',

            fontWeight: 800,

            lineHeight: 1.06,

            fontSize: {
              xs: 24,
              sm: 29,
              md: 36,
            },

            fontVariantNumeric:
              'tabular-nums',
          }}
        >
          {weightLb != null
            ? weightLb.toFixed(
                2
              )
            : '—'}

          <Typography
            component="span"

            sx={{
              ml: .6,

              fontSize: {
                xs: 13,
                md: 17,
              },

              fontWeight: 700,
            }}
          >
            lb
          </Typography>
        </Typography>


        <Stack
          direction="row"
          justifyContent="space-between"

          sx={{
            mt: 1.2,
          }}
        >
          <Typography
            color="text.secondary"

            sx={{
              fontSize: {
                xs: 9,
                md: 11,
              },
            }}
          >
            Progreso
          </Typography>

          <Typography
            color="primary.main"
            fontWeight={800}

            sx={{
              fontSize: {
                xs: 9,
                md: 11,
              },
            }}
          >
            {Math.round(
              safeProgress
            )}%
          </Typography>
        </Stack>


        <LinearProgress
          variant="determinate"
          value={safeProgress}

          sx={{
            mt: .5,

            height: {
              xs: 6,
              md: 8,
            },

            borderRadius:
              999,

            bgcolor:
              '#e8edf5',

            '& .MuiLinearProgress-bar':
              {
                borderRadius:
                  999,
              },
          }}
        />
      </Paper>


      {/* ===============================================
          BALANZA #2
          =============================================== */}

      <Paper
        elevation={0}

        sx={{
          position:
            'absolute',

          zIndex: 5,

          top: {
            xs: 55,
            md: 96,
          },

          right: {
            xs: 10,
            md: 22,
          },

          width: {
            xs: 155,
            sm: 195,
            md: 220,
          },

          p: {
            xs: 1.3,
            md: 1.8,
          },

          display: {
            xs: 'none',
            sm: 'block',
          },

          borderRadius: 3,

          bgcolor:
            'rgba(255,255,255,.94)',

          backdropFilter:
            'blur(11px)',

          border:
            '1px solid rgba(148,163,184,.32)',

          boxShadow:
            '0 14px 35px rgba(15,23,42,.08)',
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography
            fontWeight={800}

            sx={{
              fontSize: {
                sm: 12,
                md: 15,
              },

              color:
                '#17213a',
            }}
          >
            BALANZA #2
          </Typography>

          <Chip
            size="small"
            label="SIN DATOS"

            sx={{
              height: 22,
              fontSize: 9,
              fontWeight: 800,
            }}
          />
        </Stack>


        <Chip
          size="small"
          label="ESPERANDO"

          sx={{
            mt: 1,

            bgcolor:
              '#eef2f7',

            color:
              '#475569',

            fontWeight: 800,

            fontSize: 10,
          }}
        />


        <Typography
          color="text.secondary"

          sx={{
            mt: 1.3,
            fontSize: 12,
          }}
        >
          Peso actual
        </Typography>


        <Typography
          sx={{
            color:
              '#64748b',

            fontWeight: 700,

            lineHeight: 1.06,

            fontSize: {
              sm: 29,
              md: 36,
            },
          }}
        >
          —

          <Typography
            component="span"

            sx={{
              ml: .6,
              fontSize: 17,
            }}
          >
            lb
          </Typography>
        </Typography>


        <Stack
          direction="row"
          justifyContent="space-between"

          sx={{
            mt: 1.2,
          }}
        >
          <Typography
            color="text.secondary"
            fontSize={11}
          >
            Progreso
          </Typography>

          <Typography
            color="text.secondary"
            fontWeight={800}
            fontSize={11}
          >
            0%
          </Typography>
        </Stack>


        <LinearProgress
          variant="determinate"
          value={0}

          sx={{
            mt: .5,
            height: 8,
            borderRadius: 999,
            bgcolor: '#e8edf5',
          }}
        />
      </Paper>


      {/* ===============================================
          META
          =============================================== */}

      <Paper
        elevation={0}

        sx={{
          position:
            'absolute',

          zIndex: 5,

          left: {
            xs: 10,
            md: 22,
          },

          bottom: {
            xs: 8,
            md: 15,
          },

          px: {
            xs: 1.1,
            md: 1.6,
          },

          py: {
            xs: .5,
            md: .7,
          },

          borderRadius: 999,

          bgcolor:
            'rgba(255,255,255,.91)',

          backdropFilter:
            'blur(10px)',

          border:
            '1px solid rgba(37,99,235,.13)',
        }}
      >
        <Typography
          color="text.secondary"

          sx={{
            fontSize: {
              xs: 9,
              md: 11,
            },
          }}
        >
          Meta de llenado:{' '}

          <Box
            component="span"
            sx={{
              color:
                '#10224a',

              fontWeight: 800,
            }}
          >
            {targetLb.toFixed(
              2
            )}{' '}
            lb
          </Box>
        </Typography>
      </Paper>
    </Paper>
  );
}
