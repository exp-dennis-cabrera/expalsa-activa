-- Extension unaccent de PostgreSQL.
--
-- El buscador avanzado la usa para que "compresor" encuentre "Compresór" y
-- viceversa: normaliza las tildes antes de comparar. Es la misma funcion
-- que usa buildLikePredicate en Atlas CMMS.
--
-- Sin esta extension, cualquier busqueda de texto falla con
-- "function unaccent(text) does not exist".
CREATE EXTENSION IF NOT EXISTS unaccent;
