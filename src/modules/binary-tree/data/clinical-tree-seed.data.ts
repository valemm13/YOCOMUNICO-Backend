import { SeverityLevel } from '../entities/tree-node.entity';

export interface ClinicalSeedNodeSpec {
  code: string;
  category: string;
  label: string;
  description: string;
  icon: string;
  isEmergency?: boolean;
  severityLevel: SeverityLevel;
  left?: ClinicalSeedNodeSpec;
  right?: ClinicalSeedNodeSpec;
}

/**
 * Árbol de Decisión Binario Clínico para Pacientes Intubados en UCI.
 * Respeta todos los niveles base de AGENTS.md y profundiza binariamente en cada escenario
 * físico, respiratorio, postural, emocional (positivo y negativo), familiar y médico.
 */
export const CLINICAL_BINARY_TREE_SEED: ClinicalSeedNodeSpec = {
  code: 'ROOT',
  category: 'Raíz UCI',
  label: 'Menú Principal UCI',
  description:
    'Nodo raíz del sistema de comunicación binaria para pacientes intubados',
  icon: 'root',
  severityLevel: SeverityLevel.LOW,
  left: {
    code: 'A',
    category: 'Dolor y Necesidades Físicas',
    label: 'Dolor y Necesidades Físicas',
    description:
      'Malestar corporal, tubo endotraqueal, respiración, sed, temperatura o postura',
    icon: 'body',
    severityLevel: SeverityLevel.MEDIUM,
    left: {
      code: 'A1',
      category: 'Dolor y Dispositivos Médicos',
      label: 'Dolor Corporal / Malestar de Dispositivos',
      description:
        'Dolor físico localizado o incomodidad por tubo endotraqueal, sonda o vía venosa',
      icon: 'pain',
      severityLevel: SeverityLevel.HIGH,
      left: {
        code: 'A1.1',
        category: 'Dolor Físico Localizado',
        label: 'Dolor Físico Localizado',
        description: 'Dolor en una parte específica del cuerpo',
        icon: 'localized-pain',
        severityLevel: SeverityLevel.HIGH,
        left: {
          code: 'A1.1.1',
          category: 'Dolor Superior (Cabeza / Torso)',
          label: 'Cabeza, Cuello o Torso',
          description: 'Dolor en pecho, corazón, cabeza o cuello',
          icon: 'chest',
          severityLevel: SeverityLevel.HIGH,
          left: {
            code: 'A1.1.1.1',
            category: 'Dolor Torácico / Cardíaco',
            label: 'Dolor Punzante Agudo vs Constante en Pecho',
            description:
              'Evaluación urgente de dolor en tórax o región precordial',
            icon: 'heart-pain',
            severityLevel: SeverityLevel.CRITICAL,
            left: {
              code: 'A1.1.1.1.1',
              category: 'Emergencia de Dolor Torácico',
              label: 'Dolor Punzante Agudo en Pecho / Torso',
              description:
                'Dolor torácico fuerte y repentino (Dispara Alerta Médica Inmediata)',
              icon: 'alert-pain',
              isEmergency: true,
              severityLevel: SeverityLevel.CRITICAL,
            },
            right: {
              code: 'A1.1.1.1.2',
              category: 'Dolor Torácico Constante',
              label: 'Dolor Sordo / Constante en el Pecho o Costillas',
              description:
                'Molestia u opresión continua pero soportable al respirar',
              icon: 'constant-pain',
              severityLevel: SeverityLevel.HIGH,
            },
          },
          right: {
            code: 'A1.1.1.2',
            category: 'Dolor Cabeza y Cuello',
            label: 'Cabeza / Migraña vs Cuello / Nuca',
            description:
              'Dolor cefálico o rigidez cervical por postura e intubación',
            icon: 'head',
            severityLevel: SeverityLevel.HIGH,
            left: {
              code: 'A1.1.1.2.1',
              category: 'Dolor de Cabeza',
              label: 'Dolor de Cabeza Intenso / Migraña',
              description: 'Cefalea opresiva o pulsátil que requiere analgesia',
              icon: 'headache',
              severityLevel: SeverityLevel.HIGH,
            },
            right: {
              code: 'A1.1.1.2.2',
              category: 'Dolor Cervical',
              label: 'Dolor o Rigidez en Cuello y Hombros',
              description:
                'Contractura cervical por posición en cama o soporte del tubo',
              icon: 'neck',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
        },
        right: {
          code: 'A1.1.2',
          category: 'Dolor Inferior y Extremidades',
          label: 'Extremidades, Abdomen o Espalda',
          description: 'Dolor en estómago, espalda lumbar, brazos o piernas',
          icon: 'limbs',
          severityLevel: SeverityLevel.MEDIUM,
          left: {
            code: 'A1.1.2.1',
            category: 'Dolor Abdominal y Lumbar',
            label: 'Abdomen / Estómago vs Espalda Baja',
            description:
              'Dolor visceral abdominal o dolor postural en espalda/glúteos',
            icon: 'stomach',
            severityLevel: SeverityLevel.HIGH,
            left: {
              code: 'A1.1.2.1.1',
              category: 'Dolor Abdominal',
              label: 'Dolor o Cólico Abdominal / Hinchazón',
              description:
                'Dolor agudo, distensión o gases en el estómago/abdomen',
              icon: 'stomach-alert',
              severityLevel: SeverityLevel.HIGH,
            },
            right: {
              code: 'A1.1.2.1.2',
              category: 'Dolor Lumbar / Presión',
              label: 'Dolor en Espalda Baja o Glúteos por Presión',
              description:
                'Dolor por inmovilidad prolongada en el colchón (Riesgo de escara)',
              icon: 'back-pain',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
          right: {
            code: 'A1.1.2.2',
            category: 'Dolor en Extremidades',
            label: 'Piernas / Pies vs Brazos / Manos',
            description:
              'Calambres, dolor articular o entumecimiento en extremidades',
            icon: 'legs',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'A1.1.2.2.1',
              category: 'Dolor Miembros Inferiores',
              label: 'Dolor, Calambre o Hinchazón en Piernas / Pies',
              description:
                'Calambre muscular o dolor en pantorrillas/pies (Revisar circulación)',
              icon: 'legs-pain',
              severityLevel: SeverityLevel.MEDIUM,
            },
            right: {
              code: 'A1.1.2.2.2',
              category: 'Dolor Miembros Superiores',
              label: 'Dolor o Entumecimiento en Brazos / Manos',
              description:
                'Dolor muscular o por inmovilización en brazos y muñecas',
              icon: 'arm-pain',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
        },
      },
      right: {
        code: 'A1.2',
        category: 'Dispositivos Invasivos UCI',
        label: 'Molestia por Tubo / Dispositivo',
        description:
          'Tubo endotraqueal, ventilador mecánico, sonda urinaria o vía venosa',
        icon: 'tube',
        severityLevel: SeverityLevel.HIGH,
        left: {
          code: 'A1.2.1',
          category: 'Vía Aérea y Tubo Endotraqueal',
          label: 'Tubo Endotraqueal / Garganta / Flemas',
          description:
            'Secreciones acumuladas, roce del tubo o desincronía con el ventilador',
          icon: 'intubation',
          severityLevel: SeverityLevel.HIGH,
          left: {
            code: 'A1.2.1.1',
            category: 'Aspiración de Secreciones',
            label: 'Necesito Aspiración de Flemas en el Tubo',
            description:
              'Acumulación de secreciones bronquiales/saliva que obstruye el paso de aire',
            icon: 'suction',
            severityLevel: SeverityLevel.HIGH,
          },
          right: {
            code: 'A1.2.1.2',
            category: 'Roce de Tubo Endotraqueal',
            label: 'El Tubo me Lastima la Garganta o los Labios',
            description:
              'Dolor por presión del neumotaponador o cinta de fijación muy apretada',
            icon: 'throat',
            severityLevel: SeverityLevel.HIGH,
          },
        },
        right: {
          code: 'A1.2.2',
          category: 'Sondas y Vías Venosas',
          label: 'Sonda Urinaria / Nasal vs Vía Venosa',
          description:
            'Ardor, tirón o dolor por catéteres intravenosos o sondas',
          icon: 'catheter',
          severityLevel: SeverityLevel.MEDIUM,
          left: {
            code: 'A1.2.2.1',
            category: 'Vía Venosa / Catéter',
            label: 'Ardor o Tirón en Vía Venosa (Brazo / Cuello)',
            description:
              'Posible flebitis, infiltración o tensión en línea intravenosa',
            icon: 'iv-line',
            severityLevel: SeverityLevel.MEDIUM,
          },
          right: {
            code: 'A1.2.2.2',
            category: 'Sonda Vesical o Nasogástrica',
            label: 'Molestia o Ardor en Sonda Urinaria / Nariz',
            description:
              'Espasmo vesical por sonda Foley o molestia por sonda nasogástrica',
            icon: 'urinary-catheter',
            severityLevel: SeverityLevel.MEDIUM,
          },
        },
      },
    },
    right: {
      code: 'A2',
      category: 'Necesidades Fisiológicas y Confort',
      label: 'Necesidades Fisiológicas y Confort',
      description: 'Sed, postura en cama, higiene, frío/calor o falta de aire',
      icon: 'comfort',
      severityLevel: SeverityLevel.MEDIUM,
      left: {
        code: 'A2.1',
        category: 'Confort Físico e Higiene',
        label: 'Sed / Higiene vs Ajuste de Cama / Posición',
        description:
          'Hidratación bucal, náuseas, evacuación, postura o picazón',
        icon: 'bed-water',
        severityLevel: SeverityLevel.MEDIUM,
        left: {
          code: 'A2.1.1',
          category: 'Hidratación, Náuseas e Higiene',
          label: 'Sed / Boca Seca vs Náuseas / Aseo',
          description:
            'Necesidades fisiológicas inmediatas de mucosa oral o digestiva/evacuación',
          icon: 'water',
          severityLevel: SeverityLevel.MEDIUM,
          left: {
            code: 'A2.1.1.1',
            category: 'Sed y Sequedad Bucal',
            label: 'Tengo Mucha Sed / Boca y Labios Secos',
            description:
              'Solicita humedecer labios y cavidad oral con gasa húmeda o spray',
            icon: 'water-drop',
            severityLevel: SeverityLevel.MEDIUM,
          },
          right: {
            code: 'A2.1.1.2',
            category: 'Náuseas e Higiene Corporal',
            label: 'Náuseas / Ganas de Vomitar vs Necesito Aseo',
            description: 'Malestar gástrico o necesidad de limpieza/evacuación',
            icon: 'hygiene',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'A2.1.1.2.1',
              category: 'Náuseas y Mareo',
              label: 'Tengo Náuseas / Ganas de Vomitar o Mareo',
              description:
                'Riesgo de emesis en paciente intubado (Revisar sonda y antiemético)',
              icon: 'nausea',
              severityLevel: SeverityLevel.HIGH,
            },
            right: {
              code: 'A2.1.1.2.2',
              category: 'Evacuación y Aseo',
              label: 'Siento Ganas de Evacuar / Necesito Cambio o Aseo',
              description:
                'Deseo de orinar/defecar o incomodidad por humedad en la cama',
              icon: 'clean',
              severityLevel: SeverityLevel.LOW,
            },
          },
        },
        right: {
          code: 'A2.1.2',
          category: 'Postura en Cama y Piel',
          label: 'Ajuste de Cama / Posición vs Picazón',
          description:
            'Cambiar inclinación de la cama, rotar postura o aliviar comezón',
          icon: 'bed',
          severityLevel: SeverityLevel.LOW,
          left: {
            code: 'A2.1.2.1',
            category: 'Cambio de Posición',
            label: 'Subir/Bajar Cabecera vs Girarme de Lado',
            description: 'Ajuste ergonómico para aliviar cansancio postural',
            icon: 'bed-adjust',
            severityLevel: SeverityLevel.LOW,
            left: {
              code: 'A2.1.2.1.1',
              category: 'Cabecera de Cama',
              label: 'Por Favor Subir o Bajar la Cabecera de la Cama',
              description:
                'Ajustar ángulo de inclinación del respaldo de la cama UCI',
              icon: 'bed-up',
              severityLevel: SeverityLevel.LOW,
            },
            right: {
              code: 'A2.1.2.1.2',
              category: 'Rotación Postural',
              label: 'Por Favor Girarme de Lado o Acomodar Almohada',
              description:
                'Cambio de decúbito o ajuste de almohadas de soporte',
              icon: 'pillow',
              severityLevel: SeverityLevel.LOW,
            },
          },
          right: {
            code: 'A2.1.2.2',
            category: 'Prurito / Picazón Cutánea',
            label: 'Picazón en Cara/Cabeza vs Picazón en Cuerpo',
            description:
              'Prurito frecuente por medicación opioide o sudoración',
            icon: 'itch',
            severityLevel: SeverityLevel.LOW,
            left: {
              code: 'A2.1.2.2.1',
              category: 'Picazón Facial',
              label: 'Tengo Picazón Intensa en la Cara, Nariz u Ojos',
              description: 'Comezón localizada en rostro o cuero cabelludo',
              icon: 'face-itch',
              severityLevel: SeverityLevel.LOW,
            },
            right: {
              code: 'A2.1.2.2.2',
              category: 'Picazón Corporal',
              label: 'Tengo Picazón en Espalda, Brazos o Piernas',
              description: 'Comezón en tronco o extremidades',
              icon: 'body-itch',
              severityLevel: SeverityLevel.LOW,
            },
          },
        },
      },
      right: {
        code: 'A2.2',
        category: 'Temperatura y Emergencia Respiratoria',
        label: 'Temperatura (Frío/Calor) vs Falta de Aire',
        description:
          'Sensación térmica ambiental o emergencia vital por asfixia',
        icon: 'breath-temp',
        severityLevel: SeverityLevel.CRITICAL,
        left: {
          code: 'A2.2.1',
          category: 'Termorregulación y Confort Térmico',
          label: 'Tengo Frío vs Tengo Calor',
          description: 'Ajuste de cobijas o climatización del cubículo UCI',
          icon: 'thermometer',
          severityLevel: SeverityLevel.LOW,
          left: {
            code: 'A2.2.1.1',
            category: 'Sensación de Frío',
            label: 'Tengo Mucho Frío / Escalofríos (Poner cobija)',
            description:
              'Solicita abrigo adicional o revisar temperatura corporal',
            icon: 'cold',
            severityLevel: SeverityLevel.LOW,
          },
          right: {
            code: 'A2.2.1.2',
            category: 'Sensación de Calor',
            label: 'Tengo Mucho Calor / Sudoración (Quitar cobija)',
            description:
              'Solicita retirar cobertor o verificar fiebre/ambiente',
            icon: 'hot',
            severityLevel: SeverityLevel.LOW,
          },
        },
        right: {
          code: 'A2.2.2',
          category: 'Emergencia Respiratoria Vital',
          label: 'Falta de Aire / Asfixia',
          description:
            'Dificultad respiratoria severa o sensación de ahogo inminente (Emergencia vital)',
          icon: 'lungs-alert',
          isEmergency: true,
          severityLevel: SeverityLevel.CRITICAL,
        },
      },
    },
  },
  right: {
    code: 'B',
    category: 'Estado Emocional y Mensajes',
    label: 'Estado Emocional y Mensajes',
    description:
      'Emociones positivas o negativas, familia, dudas médicas o descanso',
    icon: 'heart',
    severityLevel: SeverityLevel.LOW,
    left: {
      code: 'B1',
      category: 'Estado Emocional del Paciente',
      label: 'Estado Emocional (Angustia vs Calma / Familia)',
      description:
        'Identificación binaria de emociones de angustia/tristeza o emociones de calma/felicidad y afecto',
      icon: 'emotion',
      severityLevel: SeverityLevel.MEDIUM,
      left: {
        code: 'B1.1',
        category: 'Emociones de Angustia y Malestar Psicológico',
        label: 'Ansiedad / Miedo vs Tristeza / Frustración',
        description:
          'Descarta emociones de calma y profundiza en el malestar emocional del paciente',
        icon: 'anxiety',
        severityLevel: SeverityLevel.HIGH,
        left: {
          code: 'B1.1.1',
          category: 'Miedo, Ansiedad y Delirium',
          label: 'Miedo / Pánico vs Confusión / Pesadillas',
          description: 'Temor agudo en UCI o alteraciones sensoperceptivas',
          icon: 'fear',
          severityLevel: SeverityLevel.HIGH,
          left: {
            code: 'B1.1.1.1',
            category: 'Pánico y Ansiedad Aguda',
            label: 'Ataque de Pánico / Miedo Intenso vs Nerviosismo',
            description:
              'Crisis de angustia o ansiedad sostenida por la intubación',
            icon: 'panic',
            severityLevel: SeverityLevel.HIGH,
            left: {
              code: 'B1.1.1.1.1',
              category: 'Crisis de Pánico en UCI',
              label: 'Tengo Pánico / Miedo Intenso a Morir (Acompáñenme)',
              description:
                'Crisis de pánico agudo que dispara alerta de contención emocional inmediata',
              icon: 'panic-alert',
              isEmergency: true,
              severityLevel: SeverityLevel.CRITICAL,
            },
            right: {
              code: 'B1.1.1.1.2',
              category: 'Ansiedad e Inquietud',
              label: 'Me Siento Muy Ansioso, Nervioso e Intranquilo',
              description:
                'Inquietud psicomotora y temor a los procedimientos o máquinas',
              icon: 'nervous',
              severityLevel: SeverityLevel.HIGH,
            },
          },
          right: {
            code: 'B1.1.1.2',
            category: 'Confusión y Sueños Vividos',
            label: 'Pesadillas / Alucinaciones vs Desorientación',
            description:
              'Síntomas compatibles con delirium de UCI o confusión al despertar',
            icon: 'confusion',
            severityLevel: SeverityLevel.HIGH,
            left: {
              code: 'B1.1.1.2.1',
              category: 'Alucinaciones / Pesadillas',
              label: 'Tengo Pesadillas o Veo Cosas Extrañas (Miedo)',
              description:
                'Alucinaciones visuales/auditivas o sueños vividos angustiantes',
              icon: 'nightmare',
              severityLevel: SeverityLevel.HIGH,
            },
            right: {
              code: 'B1.1.1.2.2',
              category: 'Desorientación',
              label: 'Me Siento Confundido / No Sé Qué me Pasó',
              description:
                'Necesita reorientación tranquila sobre dónde está y por qué tiene el tubo',
              icon: 'disoriented',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
        },
        right: {
          code: 'B1.1.2',
          category: 'Tristeza, Soledad y Frustración',
          label: 'Tristeza / Soledad vs Frustración / Agotamiento',
          description:
            'Sentimientos depresivos, aislamiento o impotencia por no poder hablar',
          icon: 'sadness',
          severityLevel: SeverityLevel.MEDIUM,
          left: {
            code: 'B1.1.2.1',
            category: 'Tristeza y Aislamiento',
            label: 'Tristeza Profunda vs Sentirse Solo',
            description: 'Estado de ánimo bajo o necesidad de afecto cercano',
            icon: 'tears',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'B1.1.2.1.1',
              category: 'Tristeza / Llanto',
              label: 'Me Siento Muy Triste y con Ganas de Llorar',
              description:
                'Desánimo profundo que requiere escucha empática y acompañamiento',
              icon: 'crying',
              severityLevel: SeverityLevel.MEDIUM,
            },
            right: {
              code: 'B1.1.2.1.2',
              category: 'Soledad en UCI',
              label: 'Me Siento Muy Solo y Extraño a mis Seres Queridos',
              description:
                'Sensación de aislamiento afectivo en el cubículo de UCI',
              icon: 'lonely',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
          right: {
            code: 'B1.1.2.2',
            category: 'Frustración y Fatiga Emocional',
            label: 'Frustración por No Hablar vs Cansancio Extremo',
            description:
              'Impotencia comunicativa o agotamiento por la estancia en UCI',
            icon: 'frustrated',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'B1.1.2.2.1',
              category: 'Impotencia Comunicativa',
              label: 'Me Siento Frustrado e Impotente por No Poder Hablar',
              description:
                'Sensación de estar atrapado sin voz; pide paciencia al equipo médico',
              icon: 'voiceless',
              severityLevel: SeverityLevel.MEDIUM,
            },
            right: {
              code: 'B1.1.2.2.2',
              category: 'Agotamiento Emocional',
              label: 'Estoy Agotado Física y Mentalmente de Estar Aquí',
              description:
                'Fatiga acumulada por procedimientos e internación prolongada',
              icon: 'exhausted',
              severityLevel: SeverityLevel.MEDIUM,
            },
          },
        },
      },
      right: {
        code: 'B1.2',
        category: 'Emociones Positivas, Familia y Apoyo Médico',
        label: 'Bienestar / Calma / Felicidad vs Familia / Médico',
        description:
          'Descarta emociones de tristeza y divide entre emociones positivas/calma o contacto familiar/médico',
        icon: 'family',
        severityLevel: SeverityLevel.LOW,
        left: {
          code: 'B1.2.1',
          category: 'Emociones Positivas y Bienestar',
          label: 'Calma y Alivio vs Felicidad, Gratitud y Esperanza',
          description:
            'Subdivisión binaria de estados emocionales positivos del paciente',
          icon: 'smile',
          severityLevel: SeverityLevel.LOW,
          left: {
            code: 'B1.2.1.1',
            category: 'Tranquilidad y Alivio',
            label: 'En Paz / Tranquilo vs Aliviado del Dolor',
            description:
              'Reporte positivo de calma mental o mejoría sintomática tras tratamiento',
            icon: 'calm',
            severityLevel: SeverityLevel.LOW,
            left: {
              code: 'B1.2.1.1.1',
              category: 'Paz y Seguridad',
              label: 'Me Siento Tranquilo, Seguro y en Paz',
              description:
                'El paciente reporta bienestar emocional y sensación de seguridad',
              icon: 'peace',
              severityLevel: SeverityLevel.LOW,
            },
            right: {
              code: 'B1.2.1.1.2',
              category: 'Alivio Sintomático',
              label: 'Me Siento Mucho Mejor y Más Aliviado Ahora',
              description:
                'Confirma que la analgesia o intervención médica hizo efecto positivo',
              icon: 'relief',
              severityLevel: SeverityLevel.LOW,
            },
          },
          right: {
            code: 'B1.2.1.2',
            category: 'Alegría, Gratitud y Motivación',
            label: 'Feliz / Agradecido vs Con Esperanza y Fuerza',
            description:
              'Expresión de afecto positivo, agradecimiento al personal o ánimo de recuperación',
            icon: 'happy',
            severityLevel: SeverityLevel.LOW,
            left: {
              code: 'B1.2.1.2.1',
              category: 'Gratitud y Alegría',
              label: 'Estoy Feliz y Muy Agradecido con el Equipo Médico',
              description:
                'Expresión de gratitud hacia médicos, enfermeros y familia',
              icon: 'gratitude',
              severityLevel: SeverityLevel.LOW,
            },
            right: {
              code: 'B1.2.1.2.2',
              category: 'Esperanza y Motivación',
              label: 'Me Siento con Esperanza, Fe y Fuerza para Recuperarme',
              description:
                'Estado de afrontamiento positivo y resiliencia en la UCI',
              icon: 'hope',
              severityLevel: SeverityLevel.LOW,
            },
          },
        },
        right: {
          code: 'B1.2.2',
          category: 'Familia, Explicación Médica y Espiritualidad',
          label: 'Deseo de Ver a la Familia vs Explicación Médica',
          description:
            'Peticiones afectivas hacia la familia o solicitud de información clínica',
          icon: 'family-doctor',
          severityLevel: SeverityLevel.MEDIUM,
          left: {
            code: 'B1.2.2.1',
            category: 'Contacto Familiar',
            label: 'Quiero Ver a mi Familia vs Enviarles un Mensaje de Amor',
            description:
              'Necesidad de contacto presencial o afectivo con familiares',
            icon: 'family-visit',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'B1.2.2.1.1',
              category: 'Visita Familiar',
              label: 'Quiero Ver a mi Familia o Saber Cómo Están',
              description:
                'Solicita ingreso de familiar o noticias sobre su familia',
              icon: 'family-hug',
              severityLevel: SeverityLevel.MEDIUM,
            },
            right: {
              code: 'B1.2.2.1.2',
              category: 'Mensaje a la Familia',
              label: 'Díganle a mi Familia que los Amo y Estoy Bien',
              description:
                'Pide transmitir mensaje tranquilizador a sus familiares en sala de espera',
              icon: 'love-message',
              severityLevel: SeverityLevel.LOW,
            },
          },
          right: {
            code: 'B1.2.2.2',
            category: 'Información Médica y Apoyo Espiritual',
            label: 'Necesito Explicación Médica vs Apoyo Espiritual',
            description:
              'Desea parte médico claro o acompañamiento espiritual/religioso',
            icon: 'doctor-info',
            severityLevel: SeverityLevel.MEDIUM,
            left: {
              code: 'B1.2.2.2.1',
              category: 'Explicación Clínica',
              label: 'Necesito que el Médico me Explique Cómo Voy',
              description:
                'Solicita que el médico le informe de forma clara su evolución y plan',
              icon: 'doctor-talk',
              severityLevel: SeverityLevel.MEDIUM,
            },
            right: {
              code: 'B1.2.2.2.2',
              category: 'Apoyo Espiritual',
              label: 'Deseo Apoyo Espiritual o que Oren por Mí',
              description:
                'Necesidad de acompañamiento espiritual o religioso según sus creencias',
              icon: 'spiritual',
              severityLevel: SeverityLevel.LOW,
            },
          },
        },
      },
    },
    right: {
      code: 'B2',
      category: 'Mensajes Rápidos y Entorno UCI',
      label: 'Mensajes Rápidos (Descanso / Entorno vs Preguntas)',
      description:
        'Solicitudes rápidas de sueño, luz, ruido o preguntas sobre procedimientos y tiempo',
      icon: 'chat',
      severityLevel: SeverityLevel.LOW,
      left: {
        code: 'B2.1',
        category: 'Descanso y Confort Ambiental',
        label: 'Quiero Descansar / Silencio vs Luz / Gafas',
        description:
          'Control de estímulos ambientales (ruido, iluminación) para poder dormir',
        icon: 'sleep',
        severityLevel: SeverityLevel.LOW,
        left: {
          code: 'B2.1.1',
          category: 'Sueño y Silencio',
          label: 'Quiero Descansar / Solicitud de Silencio',
          description:
            'Solicitud de apagar luces, reducir ruido o no interrumpir para dormir',
          icon: 'sleep-quiet',
          severityLevel: SeverityLevel.LOW,
        },
        right: {
          code: 'B2.1.2',
          category: 'Iluminación y Ayudas Sensoriales',
          label: 'La Luz me Molesta vs Necesito mis Gafas / Audífonos',
          description:
            'Atenuar luces del box o facilitar lentes/audífonos del paciente',
          icon: 'light-glasses',
          severityLevel: SeverityLevel.LOW,
          left: {
            code: 'B2.1.2.1',
            category: 'Exceso de Luz',
            label: 'La Luz me Lastima los Ojos (Por favor atenuar luz)',
            description:
              'Fotofobia o incomodidad por iluminación directa sobre la cama',
            icon: 'light-off',
            severityLevel: SeverityLevel.LOW,
          },
          right: {
            code: 'B2.1.2.2',
            category: 'Ayudas Visuales / Auditivas',
            label: 'Necesito mis Gafas o Audífonos para Entender Mejor',
            description:
              'Pide sus lentes o prótesis auditiva para ver la pantalla/proyección',
            icon: 'glasses',
            severityLevel: SeverityLevel.LOW,
          },
        },
      },
      right: {
        code: 'B2.2',
        category: 'Preguntas al Equipo Médico',
        label: '¿Cuánto falta para el procedimiento? vs Tiempo / Medicación',
        description:
          'Dudas frecuentes sobre extubación, procedimientos, fecha/hora y medicamentos',
        icon: 'clock',
        severityLevel: SeverityLevel.LOW,
        left: {
          code: 'B2.2.1',
          category: 'Tiempos de Procedimiento y Extubación',
          label: '¿Cuánto falta para el procedimiento o quitar el tubo?',
          description:
            'Duda sobre el tiempo restante de intubación, destete o próximo estudio',
          icon: 'procedure-time',
          severityLevel: SeverityLevel.LOW,
        },
        right: {
          code: 'B2.2.2',
          category: 'Orientación Temporal y Medicación',
          label: '¿Qué día y hora es hoy? vs ¿Qué medicamento me ponen?',
          description:
            'Orientación temporal o consulta sobre la medicación administrada',
          icon: 'calendar-meds',
          severityLevel: SeverityLevel.LOW,
          left: {
            code: 'B2.2.2.1',
            category: 'Orientación en Tiempo',
            label: '¿Qué Día es Hoy y Qué Hora Es?',
            description:
              'Solicita orientación temporal por pérdida de noción día/noche en UCI',
            icon: 'calendar',
            severityLevel: SeverityLevel.LOW,
          },
          right: {
            code: 'B2.2.2.2',
            category: 'Duda de Medicamento',
            label: '¿Qué Medicamento o Suero me Están Aplicando Ahora?',
            description:
              'Desea saber qué fármaco se le está infundiendo por vía venosa',
            icon: 'medication',
            severityLevel: SeverityLevel.LOW,
          },
        },
      },
    },
  },
};
