namespace Loupedeck.Test6Plugin
{
    public partial class Test6Plugin
    {
        public override Boolean Install()
        {
            this.CreateEmptyFile("Install");
            return true;
        }

        public override Boolean Uninstall()
        {
            this.CreateEmptyFile("Uninstall");
            return true;
        }

        private void CreateEmptyFile(String methodName)
        {
            Tracer.Trace($"Test6Plugin.{methodName}");

            var filePath = Path.Combine(this.GetPluginDataDirectory(), $"MethodCalled_{methodName}.txt");

            IoHelpers.DeleteFile(filePath);
            IoHelpers.CreateEmptyFile(filePath);
        }
    }
}
