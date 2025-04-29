import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Ingreso = sequelize.define('Ingreso', {
  id: { 
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fecha: { 
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  monto: { 
    type: DataTypes.DECIMAL(10,2),
    allowNull: false
  },
  divisa: { 
    type: DataTypes.STRING(10),
    allowNull: false
  },
  fuente_ingreso: { 
    type: DataTypes.STRING(100),
    allowNull: false
  },
  descripcion: { 
    type: DataTypes.TEXT
  }
}, {
  tableName: 'ingresos',
  timestamps: false
});

export default Ingreso;
