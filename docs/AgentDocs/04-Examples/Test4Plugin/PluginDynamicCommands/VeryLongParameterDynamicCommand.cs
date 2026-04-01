namespace Loupedeck.Test4Plugin
{
    using System;

    public class VeryLongParameterDynamicCommand : PluginDynamicCommand
    {
        public VeryLongParameterDynamicCommand()
        {
            AddParam(10);
            AddParam(185); // OK .png, OK .json
            AddParam(186); // OK .png, NOK .json
            AddParam(187); // NOK .png, NOK .json
            AddParam(1100);

            void AddParam(Int32 length)
            {
                var param = $"{length:D04}-{new String('A', length - 5)}";
                if (param.Length != length)
                {
                    throw new Exception("This cannot happen");
                }

                this.AddParameter(param, $"Length {length}", "Very long parameter");
            }
        }
    }
}
