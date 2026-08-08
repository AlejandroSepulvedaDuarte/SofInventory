export type FormHelpOperation = 'create' | 'edit';

export interface FormHelpTextByOperation {
  create: string;
  edit: string;
}

export type FormHelpText = string | FormHelpTextByOperation;

export interface FormHelpContent {
  title: FormHelpText;
  purpose: FormHelpText;
  recommendations: readonly string[];
  relationships: readonly string[];
  checklist: readonly string[];
}

export type FormHelpKey =
  | 'product'
  | 'category'
  | 'client'
  | 'provider'
  | 'user'
  | 'company'
  | 'warehouse'
  | 'purchase'
  | 'sale'
  | 'inventoryEntry'
  | 'inventoryExit'
  | 'inventoryTransfer';

export function resolveFormHelpText(
  value: FormHelpText,
  operation: FormHelpOperation,
): string {
  return typeof value === 'string' ? value : value[operation];
}

export const FORM_HELP_CONTENT: Readonly<Record<FormHelpKey, FormHelpContent>> = {
  product: {
    title: {
      create: 'Ayuda para registrar un producto',
      edit: 'Ayuda para actualizar un producto',
    },
    purpose: {
      create: 'Utiliza este formulario para incorporar un producto al catálogo y prepararlo para su gestión comercial y de inventario.',
      edit: 'Utiliza este formulario para mantener actualizada la información comercial y de clasificación de un producto existente.',
    },
    recommendations: [
      'Prepara la identificación comercial, la categoría, la unidad de medida y los valores de compra, venta e IVA.',
      'Usa una referencia que permita distinguir el producto y selecciona una clasificación coherente con su uso.',
      'La imagen es opcional; las existencias se administran mediante compras y movimientos, no desde este formulario.',
    ],
    relationships: [
      'La categoría organiza el producto y sus datos se usan después en compras, inventario y ventas.',
      'Un producto nuevo queda pendiente y sin existencias hasta que se active y se registre el ingreso correspondiente.',
    ],
    checklist: [
      'Confirma nombre, marca, referencia, categoría y unidad de medida.',
      'Revisa precios, IVA, stock mínimo y la imagen seleccionada, si existe.',
    ],
  },
  category: {
    title: {
      create: 'Ayuda para registrar una categoría',
      edit: 'Ayuda para actualizar una categoría',
    },
    purpose: 'Utiliza este formulario para crear una clasificación disponible en el catálogo de productos.',
    recommendations: [
      'Elige un nombre claro que agrupe productos con características similares y evita categorías equivalentes.',
      'Selecciona el tipo de control que mejor represente al grupo y usa la descripción para aclarar su alcance.',
    ],
    relationships: [
      'La categoría aparecerá al registrar o actualizar productos.',
      'Una categoría asociada a productos no debe eliminarse sin revisar primero esas relaciones.',
    ],
    checklist: [
      'Comprueba que no exista otra categoría con el mismo propósito.',
      'Confirma el nombre, el tipo de control y que la descripción sea útil.',
    ],
  },
  client: {
    title: {
      create: 'Ayuda para registrar un cliente',
      edit: 'Ayuda para actualizar un cliente',
    },
    purpose: {
      create: 'Utiliza este formulario para registrar a una persona o empresa que podrá identificarse en las ventas.',
      edit: 'Utiliza este formulario para mantener actualizados los datos de una persona o empresa registrada como cliente.',
    },
    recommendations: [
      'Define primero si se trata de una persona natural o jurídica y prepara su identificación y datos de contacto.',
      'Verifica que no exista un cliente con el mismo documento, teléfono, correo o identidad comercial.',
      'Para Colombia selecciona la ubicación del catálogo; para otro país completa la ubicación solicitada manualmente.',
    ],
    relationships: [
      'El cliente puede seleccionarse en una venta; también es posible utilizar el cliente general cuando no se requiere identificarlo.',
      'El estado del cliente determina si puede utilizarse en nuevas ventas.',
    ],
    checklist: [
      'Confirma tipo de cliente, documento e identidad personal o empresarial.',
      'Revisa los datos de contacto, ubicación, categoría y estado.',
    ],
  },
  provider: {
    title: {
      create: 'Ayuda para registrar un proveedor',
      edit: 'Ayuda para actualizar un proveedor',
    },
    purpose: {
      create: 'Utiliza este formulario para registrar a la persona o empresa que suministra bienes o servicios al establecimiento.',
      edit: 'Utiliza este formulario para mantener actualizada la información de un proveedor existente.',
    },
    recommendations: [
      'Prepara la identificación, razón social, persona de contacto y canales de comunicación del proveedor.',
      'Evita duplicados por documento, razón social o correo y selecciona el tipo de proveedor adecuado.',
      'Comprueba la ubicación y la dirección donde se gestiona la relación comercial.',
    ],
    relationships: [
      'Los proveedores activos estarán disponibles al registrar compras.',
      'Una compra vincula al proveedor con la factura y los productos recibidos.',
    ],
    checklist: [
      'Confirma documento, razón social y datos de contacto.',
      'Revisa tipo de proveedor, ubicación, dirección y estado.',
    ],
  },
  user: {
    title: {
      create: 'Ayuda para registrar un usuario',
      edit: 'Ayuda para actualizar un usuario',
    },
    purpose: {
      create: 'Utiliza este formulario para crear una cuenta personal de acceso a SofInventory.',
      edit: 'Utiliza este formulario para actualizar la identidad, el acceso o el rol de una cuenta existente.',
    },
    recommendations: [
      'Registra los datos de la persona que utilizará la cuenta y asigna un rol acorde con sus responsabilidades.',
      'Usa un nombre de usuario identificable y evita compartir la cuenta entre varias personas.',
      'En edición, deja los campos de contraseña vacíos si no necesitas cambiarla.',
    ],
    relationships: [
      'El rol define qué módulos y operaciones puede utilizar la persona.',
      'Las operaciones realizadas quedan asociadas al usuario correspondiente.',
    ],
    checklist: [
      'Confirma documento, nombre, correo, nombre de usuario y rol.',
      'Al crear la cuenta, verifica que la contraseña y su confirmación coincidan.',
    ],
  },
  company: {
    title: {
      create: 'Ayuda para configurar la empresa',
      edit: 'Ayuda para actualizar la empresa',
    },
    purpose: 'Utiliza este formulario para definir la identidad y los datos de contacto de la empresa que opera SofInventory.',
    recommendations: [
      'Prepara el nombre comercial, la identificación, la dirección, la ubicación y el contacto oficial.',
      'El logo es opcional; si lo utilizas, elige una imagen clara y legible.',
      'Revisa el prefijo de ventas y el mensaje final que se mostrará en los comprobantes.',
    ],
    relationships: [
      'La información vigente se incorpora a comprobantes de compras y ventas para conservar la identidad de cada operación.',
      'Solo puede existir una configuración de empresa y su mantenimiento corresponde a Administración.',
    ],
    checklist: [
      'Confirma nombre comercial, identificación, dirección, ubicación y teléfono.',
      'Revisa la vista previa del logo, el prefijo y el mensaje del comprobante.',
    ],
  },
  warehouse: {
    title: {
      create: 'Ayuda para registrar un almacén',
      edit: 'Ayuda para actualizar un almacén',
    },
    purpose: {
      create: 'Utiliza este formulario para registrar un lugar donde se controlarán existencias de productos.',
      edit: 'Utiliza este formulario para mantener identificable un almacén existente.',
    },
    recommendations: [
      'Usa un nombre reconocible y un código breve que no estén registrados en otro almacén.',
      'Incluye la dirección y notas cuando ayuden a distinguir el lugar físico.',
    ],
    relationships: [
      'El almacén se utiliza como destino de compras y como origen de ventas y salidas.',
      'Las transferencias descuentan existencias del almacén de origen y las agregan al de destino.',
    ],
    checklist: [
      'Confirma que nombre y código correspondan al lugar correcto.',
      'Revisa la dirección y las notas antes de guardar.',
    ],
  },
  purchase: {
    title: 'Ayuda para registrar una compra',
    purpose: 'Utiliza este formulario para registrar productos recibidos de un proveedor e ingresarlos al almacén seleccionado.',
    recommendations: [
      'Ten preparada la factura, el proveedor activo, la fecha, el tipo de compra y el almacén receptor.',
      'Agrega únicamente los productos recibidos y verifica cantidades, costos e IVA por cada línea.',
      'Comprueba el resumen calculado antes de registrar la operación.',
    ],
    relationships: [
      'La compra incrementa las existencias del almacén y actualiza el costo de compra y el IVA de cada producto incluido.',
      'Un almacén, proveedor o cantidad incorrectos afectan el inventario y el historial de la compra.',
    ],
    checklist: [
      'Confirma proveedor, almacén, factura, fecha y tipo de compra.',
      'Revisa productos, cantidades, costos, impuestos y total.',
    ],
  },
  sale: {
    title: 'Ayuda para registrar una venta',
    purpose: 'Utiliza este formulario para registrar los productos adquiridos por un cliente y gestionar el pago.',
    recommendations: [
      'Selecciona el almacén correcto y, cuando corresponda, identifica al cliente; también puedes usar el cliente general.',
      'Agrega productos activos con disponibilidad suficiente y verifica las cantidades antes de cobrar.',
      'Revisa descuento, IVA, total y método de pago; en efectivo confirma el valor recibido y el cambio.',
    ],
    relationships: [
      'La venta descuenta existencias del almacén y utiliza los precios e impuestos configurados en los productos.',
      'Al finalizar se genera un comprobante con la información de la operación y de la empresa.',
    ],
    checklist: [
      'Confirma cliente, almacén, productos y cantidades.',
      'Verifica descuento, impuestos, total, método de pago y efectivo recibido cuando aplique.',
    ],
  },
  inventoryEntry: {
    title: 'Ayuda para registrar una entrada de inventario',
    purpose: 'Utiliza esta operación para aumentar manualmente las existencias de un producto en un almacén.',
    recommendations: [
      'Confirma el producto, el almacén que recibirá las unidades y la cantidad que realmente ingresa.',
      'Registra un motivo breve para que el cambio pueda entenderse posteriormente.',
    ],
    relationships: [
      'La entrada incrementa de inmediato el stock disponible del producto en el almacén seleccionado.',
      'El movimiento queda relacionado con el historial de inventario.',
    ],
    checklist: [
      'Verifica producto, almacén y cantidad.',
      'Comprueba que la operación sea una entrada y revisa el motivo.',
    ],
  },
  inventoryExit: {
    title: 'Ayuda para registrar una salida de inventario',
    purpose: 'Utiliza esta operación para disminuir manualmente las existencias de un producto en un almacén.',
    recommendations: [
      'Confirma el producto, el almacén afectado y la cantidad que realmente sale.',
      'Comprueba que existan unidades suficientes y registra un motivo que explique la salida.',
    ],
    relationships: [
      'La salida reduce de inmediato el stock disponible del producto en el almacén seleccionado.',
      'Si no hay existencias suficientes, la operación no podrá completarse.',
    ],
    checklist: [
      'Verifica producto, almacén, disponibilidad y cantidad.',
      'Comprueba que la operación sea una salida y revisa el motivo.',
    ],
  },
  inventoryTransfer: {
    title: 'Ayuda para registrar una transferencia de inventario',
    purpose: 'Utiliza esta operación para trasladar existencias de un producto entre dos almacenes.',
    recommendations: [
      'Selecciona almacenes distintos y confirma cuál entrega y cuál recibe el producto.',
      'Comprueba las existencias disponibles en el origen y registra un motivo para el traslado.',
    ],
    relationships: [
      'La transferencia descuenta la cantidad del almacén de origen y la incrementa en el almacén de destino.',
      'La existencia total del producto no cambia; sí cambia su distribución por almacén.',
    ],
    checklist: [
      'Confirma producto, origen, destino y cantidad.',
      'Verifica disponibilidad, almacenes diferentes y motivo del traslado.',
    ],
  },
};
