(window.registerProject || function (project) {
    (window.projectsRegistry = window.projectsRegistry || []).push(project);
})({
    title: "Sistema de Gestion",
    desc: "Aplicación de escritorio desarrollada en Java para gestionar de forma centralizada la operación de un taller de reparación. La solución integra en un mismo sistema la gestión de inventario y repuestos, proveedores, técnicos, compras, órdenes de servicio y ventas a clientes. La persistencia local permite conservar la información y actualizar automáticamente el inventario a partir de compras, ventas y servicios realizados.",
    image: "repeating-linear-gradient(45deg, #181420, #181420 10px, #1e1929 10px, #1e1929 20px)",
    tech: ["Java", "Java Swing", "AWT", "Maven", "NetBeans GUI Builder", "MVC", "DAO", "DTO", "Modularidad", "Patrones de Diseño", "Gestion de Eventos", "Serializacion"],
    links: [
        { label: "Ver PDF", url: "./assets/docs/Documentacion_Compuclinica.pdf", type: "pdf", download: "Documentacion_Compuclinica.pdf" }
    ]
});
